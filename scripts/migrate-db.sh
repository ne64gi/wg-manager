#!/usr/bin/env sh
set -eu

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "${repo_root}"

exec docker compose run --rm wg-studio-api alembic -c /app/alembic.ini upgrade head
