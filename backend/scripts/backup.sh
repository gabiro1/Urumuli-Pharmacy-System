#!/usr/bin/env bash
# Urumuli Pharmacy System - Database backup
# Usage: ./scripts/backup.sh
# Dumps the Postgres database (schema + data) via pg_dump.
# Requires PG* env vars (DATABASE_URL or PGUSER/PGPASSWORD/PGDATABASE/PGHOST/PGPORT).

set -euo pipefail

cd "$(dirname "$0")/.."

: "${BACKUP_DIR:=backups}"
: "${PGDUMP:=pg_dump}"
: "${DATABASE_URL:-}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
OUTFILE="$BACKUP_DIR/pharmacy_${STAMP}.sql"

echo "Creating backup -> $OUTFILE"

if [[ -n "${DATABASE_URL:-}" ]]; then
  "$PGDUMP" --no-owner --no-privileges --clean --if-exists "$DATABASE_URL" > "$OUTFILE"
else
  "$PGDUMP" --no-owner --no-privileges --clean --if-exists \
    -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" \
    -U "${PGUSER:-postgres}" -d "${PGDATABASE:-pharmacy}" > "$OUTFILE"
fi

echo "Backup complete: $OUTFILE"
echo "Size: $(du -h "$OUTFILE" | cut -f1)"
