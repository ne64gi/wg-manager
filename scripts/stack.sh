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

wait_for_api_health() {
  attempts="${1:-30}"
  delay_seconds="${2:-2}"
  i=1

  while [ "$i" -le "$attempts" ]; do
    if docker compose ps --status running wg-studio-api >/dev/null 2>&1; then
      if docker compose exec -T wg-studio-api python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).getcode() == 200 else 1)" >/dev/null 2>&1; then
        return 0
      fi
    fi

    echo "Waiting for wg-studio-api health... (${i}/${attempts})"
    sleep "$delay_seconds"
    i=$((i + 1))
  done

  echo "wg-studio-api did not become healthy in time." >&2
  return 1
}

check_web_reachable() {
  docker compose exec -T wg-studio-api python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://wg-studio-web/wg-studio/', timeout=3).getcode() < 500 else 1)" >/dev/null 2>&1
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
    wait_for_api_health "${WG_STACK_HEALTH_ATTEMPTS:-30}" "${WG_STACK_HEALTH_DELAY_SECONDS:-2}"
    docker compose exec -T wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
    if check_web_reachable; then
      echo "wg-studio-web is reachable."
    else
      echo "wg-studio-web is not reachable from the API container yet." >&2
      exit 1
    fi
    ;;
  wait)
    wait_for_api_health "${WG_STACK_HEALTH_ATTEMPTS:-30}" "${WG_STACK_HEALTH_DELAY_SECONDS:-2}"
    ;;
  smoke)
    wait_for_api_health "${WG_STACK_HEALTH_ATTEMPTS:-30}" "${WG_STACK_HEALTH_DELAY_SECONDS:-2}"
    if ! check_web_reachable; then
      echo "wg-studio-web is not reachable from the API container; aborting smoke run." >&2
      exit 1
    fi
    docker compose --profile test run --rm wg-studio-e2e "$@"
    ;;
  cli)
    docker compose --profile tools run --rm wg-studio-cli "$@"
    ;;
  e2e)
    docker compose --profile test run --rm wg-studio-e2e "$@"
    ;;
  *)
    echo "Unsupported command '$command_name'. Use: up, build, restart, down, ps, logs, wait, health, smoke, cli, e2e." >&2
    exit 1
    ;;
esac
