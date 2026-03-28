#!/usr/bin/env sh
set -eu

[ -f ./.env ] && set -a && . ./.env && set +a

usage() {
  echo "Usage: $0 --input backups/state/wg-studio-state-YYYYMMDD-HHMMSS.json --yes" >&2
  exit 1
}

input_path=""
confirmed="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --input)
      [ "$#" -ge 2 ] || usage
      input_path="$2"
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

[ -n "${input_path}" ] || usage
[ -f "${input_path}" ] || {
  echo "State file not found: ${input_path}" >&2
  exit 1
}
[ "${confirmed}" = "true" ] || {
  echo "Refusing destructive state import without --yes" >&2
  exit 1
}

docker compose --profile tools run --rm -T \
  -v "$(pwd):/workspace" \
  wg-studio-cli \
  state import --input "/workspace/${input_path}"
