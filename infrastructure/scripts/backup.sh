#!/usr/bin/env bash
# Dumps the Postgres database to a timestamped, gzip-compressed custom-format
# file. Run from anywhere; reads DATABASE_URL from the environment (source
# .env first) so it works the same in dev and on the VPS.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set — run: set -a && source .env && set +a" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/office_platform-$TIMESTAMP.dump"

# pg_dump doesn't understand Prisma's "?schema=public" query param — strip it.
PG_DUMP_URL="${DATABASE_URL%%\?*}"

echo "Backing up to $OUT_FILE ..."
pg_dump "$PG_DUMP_URL" --format=custom --file="$OUT_FILE"

echo "Backup complete: $(du -h "$OUT_FILE" | cut -f1) -> $OUT_FILE"

# Keep the last 14 backups only (2 weeks at daily cadence via cron).
ls -1t "$BACKUP_DIR"/office_platform-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
