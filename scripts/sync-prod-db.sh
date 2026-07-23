#!/bin/bash

# Sincroniza o banco de produção (VPS jarvis) para o PostgreSQL local.
#
# Uso:
#   ./scripts/sync-prod-db.sh              # dump + restore
#   ./scripts/sync-prod-db.sh --dump-only  # só salva o dump
#   ./scripts/sync-prod-db.sh --file /tmp/houseapp.sql  # restaura dump existente
#
# Variáveis opcionais (sobrescrevem api/.env):
#   SSH_HOST, REMOTE_DB, LOCAL_DOCKER_CONTAINER, BACKUP_DIR

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/api/.env}"

SSH_HOST="${SSH_HOST:-jarvis}"
REMOTE_DB="${REMOTE_DB:-houseapp_v2}"
REMOTE_PG_USER="${REMOTE_PG_USER:-postgres}"
REMOTE_CONTAINER_FILTER="${REMOTE_CONTAINER_FILTER:-postgres_postgres}"

BACKUP_DIR="${BACKUP_DIR:-/tmp}"
DUMP_ONLY=false
DUMP_FILE=""

usage() {
	cat <<EOF
Uso: $0 [opções]

Opções:
  --dump-only       Apenas exporta produção para arquivo (não restaura local)
  --file PATH       Restaura um dump existente (não busca produção)
  -h, --help        Mostra esta ajuda

Exemplos:
  $0
  $0 --dump-only
  $0 --file /tmp/houseapp_prod.sql

Variáveis de ambiente:
  SSH_HOST                  Alias SSH (padrão: jarvis)
  REMOTE_DB                 Banco remoto (padrão: houseapp)
  LOCAL_DOCKER_CONTAINER    Container local do Postgres (auto-detecta houseapp_postgres)
  BACKUP_DIR                Pasta dos dumps (padrão: /tmp)
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dump-only)
			DUMP_ONLY=true
			shift
			;;
		--file)
			DUMP_FILE="${2:?Informe o caminho do arquivo}"
			shift 2
			;;
		-h | --help)
			usage
			exit 0
			;;
		*)
			echo "Opção desconhecida: $1" >&2
			usage
			exit 1
			;;
	esac
done

read_env_var() {
	local key="$1"
	local default="${2:-}"

	if [[ ! -f "$ENV_FILE" ]]; then
		echo "$default"
		return
	fi

	local value
	value="$(grep -E "^${key}=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
	value="${value%$'\r'}"
	value="${value#\"}"
	value="${value%\"}"
	value="${value#\'}"
	value="${value%\'}"

	if [[ -z "$value" ]]; then
		echo "$default"
	else
		echo "$value"
	fi
}

DB_HOST="$(read_env_var DB_HOST localhost)"
DB_PORT="$(read_env_var DB_PORT 5432)"
DB_USER="$(read_env_var DB_USER postgres)"
DB_PASSWORD="$(read_env_var DB_PASSWORD postgres)"
DB_NAME="$(read_env_var DB_NAME houseapp_v2)"

LOCAL_DOCKER_CONTAINER="${LOCAL_DOCKER_CONTAINER:-}"
if [[ -z "$LOCAL_DOCKER_CONTAINER" ]]; then
	if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'houseapp_postgres'; then
		LOCAL_DOCKER_CONTAINER="houseapp_postgres"
	elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'estokai_postgres'; then
		LOCAL_DOCKER_CONTAINER="estokai_postgres"
	fi
fi

timestamp="$(date +%Y%m%d_%H%M%S)"
default_dump_file="${BACKUP_DIR}/houseapp_prod_${timestamp}.sql"

remote_pg_dump() {
	ssh "$SSH_HOST" "docker exec \$(docker ps -q -f name=${REMOTE_CONTAINER_FILTER}) pg_dump -U ${REMOTE_PG_USER} -d ${REMOTE_DB} --no-owner --no-acl --clean --if-exists"
}

fetch_dump() {
	if [[ -n "$DUMP_FILE" ]]; then
		if [[ ! -f "$DUMP_FILE" ]]; then
			echo "Arquivo não encontrado: $DUMP_FILE" >&2
			exit 1
		fi
		echo "Usando dump existente: $DUMP_FILE"
		return
	fi

	DUMP_FILE="$default_dump_file"
	echo "Exportando produção via SSH (${SSH_HOST})..."
	echo "Salvando dump em: $DUMP_FILE"
	remote_pg_dump >"$DUMP_FILE"
	echo "Dump: $(du -h "$DUMP_FILE" | cut -f1), $(wc -l <"$DUMP_FILE") linhas"
}

restore_local() {
	echo "Restaurando em ${DB_NAME}@${DB_HOST}:${DB_PORT} (usuário: ${DB_USER})..."

	if [[ -n "$LOCAL_DOCKER_CONTAINER" ]]; then
		docker exec -i "$LOCAL_DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <"$DUMP_FILE"
	else
		PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <"$DUMP_FILE"
	fi

	echo ""
	echo "Verificação:"
	if [[ -n "$LOCAL_DOCKER_CONTAINER" ]]; then
		docker exec "$LOCAL_DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
			"SELECT count(*) AS tables FROM information_schema.tables WHERE table_schema = 'public';"
		docker exec "$LOCAL_DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
			"SELECT relname AS table, n_live_tup AS rows FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"
	else
		PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
			"SELECT count(*) AS tables FROM information_schema.tables WHERE table_schema = 'public';"
	fi
}

main() {
	if [[ -n "$DUMP_FILE" ]]; then
		restore_local
		echo ""
		echo "Restore concluído."
		return
	fi

	fetch_dump

	if [[ "$DUMP_ONLY" == true ]]; then
		echo ""
		echo "Dump concluído: $DUMP_FILE"
		echo "Para restaurar depois: $0 --file $DUMP_FILE"
		return
	fi

	restore_local
	echo ""
	echo "Sincronização concluída."
	echo "Dump salvo em: $DUMP_FILE"
}

main
