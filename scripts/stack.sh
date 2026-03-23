#!/usr/bin/env sh
set -eu

command_name="${1:-up}"
shift || true

resolve_services() {
  case "${1:-core}" in
    core)
      echo "postgres wireguard wg-studio-api wg-studio-web"
      ;;
    runtime)
      echo "wireguard wg-studio-api"
      ;;
    api)
      echo "wg-studio-api"
      ;;
    web)
      echo "wg-studio-web"
      ;;
    db)
      echo "postgres"
      ;;
    *)
      echo "$1"
      ;;
  esac
}

case "$command_name" in
  up)
    target="${1:-core}"
    if [ "$#" -gt 0 ]; then
      shift
    fi
    # shellcheck disable=SC2086
    docker compose up -d --build $(resolve_services "$target") "$@"
    ;;
  build)
    target="${1:-core}"
    if [ "$#" -gt 0 ]; then
      shift
    fi
    # shellcheck disable=SC2086
    docker compose build $(resolve_services "$target") "$@"
    ;;
  restart)
    target="${1:-core}"
    if [ "$#" -gt 0 ]; then
      shift
    fi
    # shellcheck disable=SC2086
    docker compose restart $(resolve_services "$target") "$@"
    ;;
  down)
    docker compose down "$@"
    ;;
  ps)
    docker compose ps "$@"
    ;;
  logs)
    docker compose logs "$@"
    ;;
  health)
    docker compose ps
    docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
    ;;
  smoke)
    docker compose --profile test run --rm wg-studio-e2e "$@"
    ;;
  cli)
    docker compose --profile tools run --rm wg-studio-cli "$@"
    ;;
  e2e)
    docker compose --profile test run --rm wg-studio-e2e "$@"
    ;;
  *)
    echo "Unsupported command '$command_name'. Use: up, build, restart, down, ps, logs, health, smoke, cli, e2e." >&2
    exit 1
    ;;
esac
