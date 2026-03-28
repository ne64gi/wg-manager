#!/usr/bin/env sh
set -eu

[ -f ./.env ] && set -a && . ./.env && set +a

usage() {
  echo "Usage: $0 --main backups/db/wg-studio-YYYYMMDD-HHMMSS.dump [--audit backups/db/wg-studio-audit-YYYYMMDD-HHMMSS.dump] [--dry-run] --yes" >&2
  exit 1
}

main_dump=""
audit_dump=""
confirmed="false"
dry_run="false"

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
    --dry-run)
      dry_run="true"
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

echo "Restore target:"
echo "  main db : ${POSTGRES_DB}"
echo "  main dump: ${main_dump}"
if [ -n "${audit_dump}" ]; then
  echo "  audit db : ${POSTGRES_AUDIT_DB}"
  echo "  audit dump: ${audit_dump}"
fi

echo "Main dump contents preview:"
docker compose --profile tools run --rm -T \
  -v "$(pwd):/workspace" \
  wg-studio-pgtools \
  "pg_restore --list \"/workspace/${main_dump}\" | sed -n '1,20p'"

if [ -n "${audit_dump}" ]; then
  echo "Audit dump contents preview:"
  docker compose --profile tools run --rm -T \
    -v "$(pwd):/workspace" \
    wg-studio-pgtools \
    "pg_restore --list \"/workspace/${audit_dump}\" | sed -n '1,20p'"
fi

if [ "${dry_run}" = "true" ]; then
  echo "Dry run only. No restore executed."
  exit 0
fi

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
