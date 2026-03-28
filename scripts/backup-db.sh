#!/usr/bin/env sh
set -eu

[ -f ./.env ] && set -a && . ./.env && set +a

timestamp="${1:-$(date '+%Y%m%d-%H%M%S')}"
backup_dir="${WG_STUDIO_BACKUP_DIR:-backups/db}"
main_dump="wg-studio-${timestamp}.dump"
audit_dump="wg-studio-audit-${timestamp}.dump"

mkdir -p "${backup_dir}"

docker compose --profile tools run --rm -T \
  -v "$(pwd)/${backup_dir}:/backups/db" \
  wg-studio-pgtools \
  "pg_dump -h postgres -U \"${POSTGRES_USER}\" -d \"${POSTGRES_DB}\" -Fc -f \"/backups/db/${main_dump}\" && \
   pg_dump -h postgres -U \"${POSTGRES_USER}\" -d \"${POSTGRES_AUDIT_DB}\" -Fc -f \"/backups/db/${audit_dump}\""

echo "Created:"
echo "  ${backup_dir}/${main_dump}"
echo "  ${backup_dir}/${audit_dump}"
