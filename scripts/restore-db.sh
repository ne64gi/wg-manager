#!/usr/bin/env sh
set -eu

[ -f ./.env ] && set -a && . ./.env && set +a

usage() {
  echo "Usage: $0 --main backups/db/wg-studio-YYYYMMDD-HHMMSS.dump [--audit backups/db/wg-studio-audit-YYYYMMDD-HHMMSS.dump] --yes" >&2
  exit 1
}

main_dump=""
audit_dump=""
confirmed="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --main)
      [ "$#" -ge 2 ] || usage
      main_dump="$2"
      shift 2
      ;;
    --audit)
      [ "$#" -ge 2 ] || usage
      audit_dump="$2"
      shift 2
      ;;
    --yes)
      confirmed="true"
      shift
      ;;
    *)
      usage
      ;;
  esac
done

[ -n "${main_dump}" ] || usage
[ -f "${main_dump}" ] || {
  echo "Main dump not found: ${main_dump}" >&2
  exit 1
}

if [ -n "${audit_dump}" ] && [ ! -f "${audit_dump}" ]; then
  echo "Audit dump not found: ${audit_dump}" >&2
  exit 1
fi

[ "${confirmed}" = "true" ] || {
  echo "Refusing destructive restore without --yes" >&2
  exit 1
}

echo "Stopping API and web before restore..."
docker compose stop wg-studio-api wg-studio-web >/dev/null

cleanup() {
  echo "Starting API and web..."
  docker compose up -d wg-studio-api wg-studio-web >/dev/null
}
trap cleanup EXIT INT TERM

docker compose --profile tools run --rm -T \
  -v "$(pwd):/workspace" \
  wg-studio-pgtools \
  "pg_restore -h postgres -U \"${POSTGRES_USER}\" -d \"${POSTGRES_DB}\" --clean --if-exists --no-owner --no-privileges \"/workspace/${main_dump}\""

if [ -n "${audit_dump}" ]; then
  docker compose --profile tools run --rm -T \
    -v "$(pwd):/workspace" \
    wg-studio-pgtools \
    "pg_restore -h postgres -U \"${POSTGRES_USER}\" -d \"${POSTGRES_AUDIT_DB}\" --clean --if-exists --no-owner --no-privileges \"/workspace/${audit_dump}\""
fi

echo "Restore completed."
