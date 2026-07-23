#!/usr/bin/env bash
# Cross-VPS Postgres backup: dump prod DBs and keep copies only on the peer host.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/backup.env}"

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Missing env file: $ENV_FILE" >&2
	exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${PEER_HOST:?PEER_HOST is required}"
: "${CONTAINER_FILTER:?CONTAINER_FILTER is required}"
: "${PG_USER:?PG_USER is required}"
: "${HOST_LABEL:?HOST_LABEL is required}"
: "${DATABASES:?DATABASES is required}"

KEEP_DAYS="${KEEP_DAYS:-7}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/postgres}"
REMOTE_DIR="$BACKUP_ROOT/$HOST_LABEL"
DATE="$(date +%Y%m%d_%H%M%S)"
STAGING_DIR="$(mktemp -d "/tmp/postgres-backup-${HOST_LABEL}.XXXXXX")"

cleanup() {
	rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

log() {
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
	log "ERROR: $*" >&2
	exit 1
}

CID="$(docker ps -q -f "name=${CONTAINER_FILTER}" | head -1 || true)"
[[ -n "$CID" ]] || fail "No running container matching name=${CONTAINER_FILTER}"

ssh "$PEER_HOST" "mkdir -p '$REMOTE_DIR'"

read -r -a DB_LIST <<<"$DATABASES"
[[ ${#DB_LIST[@]} -gt 0 ]] || fail "DATABASES is empty"

DUMPED=()

for db in "${DB_LIST[@]}"; do
	exists="$(docker exec "$CID" psql -U "$PG_USER" -d postgres -tAc \
		"SELECT 1 FROM pg_database WHERE datname = '${db}'" | tr -d '[:space:]')"
	[[ "$exists" == "1" ]] || fail "Database does not exist: $db"

	container_tmp="/tmp/${HOST_LABEL}_${db}_${DATE}.dump"
	stage_file="${STAGING_DIR}/${HOST_LABEL}_${db}_${DATE}.dump"

	log "Dumping $db"
	docker exec "$CID" pg_dump -U "$PG_USER" -d "$db" -Fc -f "$container_tmp"
	docker cp "${CID}:${container_tmp}" "$stage_file"
	docker exec "$CID" rm -f "$container_tmp"
	DUMPED+=("$stage_file")
done

[[ ${#DUMPED[@]} -gt 0 ]] || fail "No dumps created"

log "Sending ${#DUMPED[@]} dump(s) to ${PEER_HOST}:${REMOTE_DIR}/ (peer only)"
rsync -az "${DUMPED[@]}" "${PEER_HOST}:${REMOTE_DIR}/"

log "Pruning peer dumps older than ${KEEP_DAYS} days on ${PEER_HOST}"
ssh "$PEER_HOST" \
	"find '$REMOTE_DIR' -type f -name '${HOST_LABEL}_*.dump' -mtime +${KEEP_DAYS} -print -delete || true"

log "Backup complete (${#DUMPED[@]} database(s) stored on ${PEER_HOST})"
for f in "${DUMPED[@]}"; do
	du -h "$f"
done
