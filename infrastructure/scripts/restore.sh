#!/usr/bin/env bash
# Restores a backup produced by backup.sh into DATABASE_URL. DESTRUCTIVE:
# drops and recreates the target schema first. Usage:
#   ./restore.sh backups/office_platform-20260101-000000.dump
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set — run: set -a && source .env && set +a" >&2
  exit 1
fi

DUMP_FILE="${1:?Usage: restore.sh <path-to-dump-file>}"
if [ ! -f "$DUMP_FILE" ]; then
  echo "No such file: $DUMP_FILE" >&2
  exit 1
fi

read -r -p "This will DROP and recreate all data in the target database. Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# pg_restore/psql don't understand Prisma's "?schema=public" query param.
PG_URL="${DATABASE_URL%%\?*}"

echo "Dropping and recreating public schema ..."
psql "$PG_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Restoring from $DUMP_FILE ..."
pg_restore --dbname="$PG_URL" --no-owner --no-privileges "$DUMP_FILE"

echo "Restore complete."
