#!/usr/bin/env bash
set -euo pipefail

STATUS_FILE="${OPCBRIDGE_HISTORIAN_MIGRATION_STATUS:-/var/lib/opcbridge/historian/migration-status.json}"
REQUEST_FILE="${OPCBRIDGE_HISTORIAN_MIGRATION_REQUEST:-/var/lib/opcbridge/historian/migration-requested}"
SCHEMA_FILE="${OPCBRIDGE_HISTORIAN_SCHEMA:-/etc/opcbridge/historian/schema.sql}"
DB="${HISTORIAN_PGDB:-opcbridge_historian}"
DB_USER="${HISTORIAN_PGUSER:-opcbridge_historian}"
START_EPOCH="$(date +%s)"
START_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TABLE_SIZE="unknown"
ESTIMATED_ROWS=0
FINISHED=0

mkdir -p "$(dirname "$STATUS_FILE")"

write_status() {
  local state="$1"
  local message="$2"
  local now elapsed tmp
  now="$(date +%s)"
  elapsed=$((now - START_EPOCH))
  tmp="${STATUS_FILE}.tmp"
  printf '{"state":"%s","message":"%s","started_at":"%s","updated_at":"%s","elapsed_seconds":%s,"table_size":"%s","estimated_rows":%s}\n' \
    "$state" "$message" "$START_ISO" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$elapsed" "$TABLE_SIZE" "$ESTIMATED_ROWS" >"$tmp"
  chmod 0644 "$tmp"
  mv -f "$tmp" "$STATUS_FILE"
}

on_exit() {
  local rc=$?
  if [[ "$FINISHED" -ne 1 && "$rc" -ne 0 ]]; then
    write_status "failed" "TimescaleDB migration failed; inspect the migration service journal."
  fi
}
trap on_exit EXIT

if [[ ! -f "$REQUEST_FILE" ]]; then
  echo "No historian migration has been requested; exiting."
  exit 0
fi
if [[ ! -r "$SCHEMA_FILE" ]]; then
  echo "Historian schema is unavailable: $SCHEMA_FILE" >&2
  exit 1
fi

TABLE_SIZE="$(runuser -u postgres -- psql -d "$DB" -X -tAc "SELECT pg_size_pretty(pg_total_relation_size('public.tag_samples'));" | xargs)"
ESTIMATED_ROWS="$(runuser -u postgres -- psql -d "$DB" -X -tAc "SELECT GREATEST(reltuples::bigint,0) FROM pg_class WHERE oid='public.tag_samples'::regclass;" | xargs)"
write_status "migrating" "Converting legacy historian data to TimescaleDB."

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d "$DB" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d "$DB" \
  -c "SELECT create_hypertable('tag_samples', 'ts', if_not_exists => TRUE, migrate_data => TRUE);" &
MIGRATION_PID=$!
while kill -0 "$MIGRATION_PID" 2>/dev/null; do
  sleep 15
  if kill -0 "$MIGRATION_PID" 2>/dev/null; then
    write_status "migrating" "Converting legacy historian data to TimescaleDB."
    echo "Historian migration is active ($(( $(date +%s) - START_EPOCH ))s elapsed; ${TABLE_SIZE}, approximately ${ESTIMATED_ROWS} rows)."
  fi
done
wait "$MIGRATION_PID"

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d "$DB" <"$SCHEMA_FILE"
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d "$DB" -c "ALTER TABLE public.tag_samples OWNER TO \"${DB_USER}\";"

rm -f "$REQUEST_FILE"
FINISHED=1
write_status "completed" "TimescaleDB migration completed; historian is starting."
echo "Historian TimescaleDB migration completed successfully."

