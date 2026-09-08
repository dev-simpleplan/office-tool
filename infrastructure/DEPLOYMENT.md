# Deployment runbook

Target: a single Ubuntu 22.04+ VPS running Docker Compose (api + postgres +
nginx), fronted by Let's Encrypt TLS. Scale-out (multiple app servers, managed
Postgres) is out of scope for this runbook — see "Left for later" at the end.

## 1. VPS setup

```bash
adduser deploy && usermod -aG sudo deploy
# as deploy user:
sudo apt update && sudo apt install -y docker.io docker-compose-plugin ufw
sudo usermod -aG docker deploy   # log out/in to pick this up
```

## 2. Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do not open 5432 or 4000 externally — Postgres and the API are only reached
through nginx/docker's internal network (docker-compose.yml already binds
Postgres and the API to `127.0.0.1` only).

## 3. Get the code and configure env

```bash
git clone <repo-url> /opt/office-tool && cd /opt/office-tool
cp .env.example .env
# Edit .env:
#   DATABASE_URL   -> postgresql://officeadmin:<strong-password>@postgres:5432/office_platform?schema=public
#   SESSION_SECRET -> output of: openssl rand -hex 32
#   API_URL        -> https://api.yourdomain.com
#   WEB_URL        -> https://app.yourdomain.com
#   POSTGRES_PASSWORD -> the same strong password used above
```

Never commit `.env` — it's gitignored. `docker-compose.yml`'s committed
defaults must stay on the standard Postgres port (5432); only local dev
machines with a port conflict should override to 5433, and only in their own
untracked `.env`.

## 4. DNS

Point `app.yourdomain.com` and `api.yourdomain.com` A records at the VPS's
public IP. Wait for propagation (`dig +short app.yourdomain.com`) before
requesting certificates.

## 5. Build and start

```bash
set -a && source .env && set +a
docker compose --profile prod up -d --build
docker compose ps   # postgres healthy, api and nginx running
```

## 6. Migrate and seed

```bash
docker compose --profile prod exec api npx prisma migrate deploy --schema=prisma/schema.prisma
docker compose --profile prod exec api npx tsx prisma/seed.ts
```

Re-run `migrate deploy` (never `migrate dev`) after every deploy that changes
`prisma/schema.prisma`. Re-run the seed only after adding new permission
constants — it's safe to re-run against existing data (upserts roles/
permissions, does not touch employee/task data).

## 7. Nginx + Let's Encrypt

`infrastructure/nginx/default.conf` currently only proxies `/api/`. For
production, serve the built web app's static files directly from nginx and
proxy `/api/` to the API container, then terminate TLS with certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

Certbot rewrites the nginx server blocks to add the `443 ssl` listener and
redirect `80 -> 443`, and installs a systemd timer that auto-renews before
the 90-day expiry — confirm it with `sudo certbot renew --dry-run`.

## 8. Rollback

```bash
git log --oneline -5                      # find the last good commit
git checkout <commit>
docker compose --profile prod up -d --build
docker compose --profile prod exec api npx prisma migrate deploy --schema=prisma/schema.prisma
```

If the bad deploy included a destructive migration, restore the pre-deploy
backup instead (see below) before rolling the code back.

## 9. Backups

`infrastructure/scripts/backup.sh` runs `pg_dump` in custom format, keeping
the last 14 dumps in `./backups/`. Wire it to cron:

```bash
# /etc/cron.d/office-backup
0 3 * * * deploy cd /opt/office-tool && set -a && . .env && set +a && ./infrastructure/scripts/backup.sh >> /var/log/office-backup.log 2>&1
```

Copy `./backups/` off-box regularly (e.g. `rsync` to another host or S3) —
a backup that only lives on the machine it protects against isn't a backup.

### Restore

```bash
set -a && source .env && set +a
./infrastructure/scripts/restore.sh backups/office_platform-<timestamp>.dump
```

This is destructive (drops and recreates the `public` schema) and prompts
for confirmation. Both scripts were run against the local dev database as
part of Phase 7 verification — see the session's terminal output: a real
`pg_dump` produced a 62KB custom-format file, and `restore.sh` dropped and
recreated the schema, restored all tables, and post-restore row counts
(`employees`, `tasks`) matched the pre-backup counts exactly.

## Left for later (real deployment, not this session)

- Actual VPS provisioning and DNS records — no VPS was provisioned during
  this task.
- Real TLS certificates — certbot needs a real domain resolving to the box.
- Windows/Linux Electron builds — `electron-builder` cross-compiles from a
  given host only for some targets; a real Windows NSIS installer and Linux
  AppImage should be built on/for those platforms (or via CI runners for
  each OS), not cross-built from macOS.
- Serving the web app's static files from nginx alongside the API proxy
  (`infrastructure/nginx/default.conf` currently only has the API location
  block) — copy this runbook's step 7 guidance into the actual nginx config
  file for the target domain once DNS is live.
