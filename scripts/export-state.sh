#!/usr/bin/env sh
set -eu

[ -f ./.env ] && set -a && . ./.env && set +a

timestamp="${1:-$(date '+%Y%m%d-%H%M%S')}"
output_dir="${WG_STUDIO_STATE_DIR:-backups/state}"
output_path="${output_dir}/wg-studio-state-${timestamp}.json"

mkdir -p "${output_dir}"

docker compose --profile tools run --rm -T \
  -v "$(pwd)/${output_dir}:/backups/state" \
  wg-studio-cli \
  state export --output "/backups/state/$(basename "${output_path}")"

chown "$(id -u):$(id -g)" "${output_path}" 2>/dev/null || true

echo "Created: ${output_path}"
