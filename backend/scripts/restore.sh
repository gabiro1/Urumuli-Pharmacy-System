#!/usr/bin/env bash
# Urumuli Pharmacy System - Database restore
# Usage: ./scripts/restore.sh [backupfile]
# Restores a pg_dump produced by backup.sh (plain SQL, with --clean).
# Backs up the current database first unless SKIP_SAFE_BACKUP=1.

set -euo pipefail

cd "$(dirname "$0")/.."

: "${BACKUP_DIR:=backups}"
: "${PSQL:=psql}"
: "${DATABASE_URL:-}"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  LATEST="$(ls -t "$BACKUP_DIR"/pharmacy_*.sql 2>/dev/null | head -n1 || true)"
  if [[ -z "$LATEST" ]]; then
    echo "No backup file given and none found in $BACKUP_DIR" >&2
    exit 1
  fi
  BACKUP_FILE="$LATEST"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "Restoring from $BACKUP_FILE"

if [[ "${SKIP_SAFE_BACKUP:-0}" != "1" ]]; then
  SAFE="$(dirname "$BACKUP_FILE")/pre_restore_$(date +%Y%m%d_%H%M%S).sql"
  echo "Safety backup of current DB -> $SAFE"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    pg_dump --no-owner --no-privileges "$DATABASE_URL" > "$SAFE"
  else
    pg_dump --no-owner --no-privileges \
      -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" \
      -U "${PGUSER:-postgres}" -d "${PGDATABASE:-pharmacy}" > "$SAFE"
  fi
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  "$PSQL" "$DATABASE_URL" < "$BACKUP_FILE"
else
  "$PSQL" \
    -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" \
    -U "${PGUSER:-postgres}" -d "${PGDATABASE:-pharmacy}" < "$BACKUP_FILE"
fi

echo "Restore complete."
