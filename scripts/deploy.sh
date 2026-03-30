#!/usr/bin/env sh
set -eu

branch="${1:-main}"
remote="${WG_STUDIO_DEPLOY_REMOTE:-origin}"

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "${repo_root}"

if [ ! -f ./.env ]; then
  echo "Missing .env in ${repo_root}. Deployment expects server-local runtime config." >&2
  exit 1
fi

if [ ! -f ./docker-compose.override.yml ]; then
  echo "Warning: docker-compose.override.yml not found. Continuing with base compose only." >&2
fi

git fetch "${remote}" "${branch}"
git pull --ff-only "${remote}" "${branch}"

docker compose config >/dev/null
docker compose up -d --build
docker compose ps
