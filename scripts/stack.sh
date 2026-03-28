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

e2e_compose() {
  docker compose -f docker-compose.e2e.yml -p wg-studio-e2e "$@"
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

wait_for_e2e_api_health() {
  attempts="${1:-30}"
  delay_seconds="${2:-2}"
  i=1

  while [ "$i" -le "$attempts" ]; do
    if e2e_compose ps --status running wg-studio-api >/dev/null 2>&1; then
      if e2e_compose exec -T wg-studio-api python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).getcode() == 200 else 1)" >/dev/null 2>&1; then
        return 0
      fi
    fi

    echo "Waiting for isolated wg-studio-api health... (${i}/${attempts})"
    sleep "$delay_seconds"
    i=$((i + 1))
  done

  echo "Isolated wg-studio-api did not become healthy in time." >&2
  return 1
}

check_e2e_web_reachable() {
  e2e_compose exec -T wg-studio-api python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://wg-studio-web/wg-studio/', timeout=3).getcode() < 500 else 1)" >/dev/null 2>&1
}

run_isolated_e2e() {
  e2e_compose up -d --build
  cleanup() {
    e2e_compose down -v >/dev/null 2>&1 || true
  }
  trap cleanup EXIT INT TERM

  wait_for_e2e_api_health "${WG_STACK_HEALTH_ATTEMPTS:-30}" "${WG_STACK_HEALTH_DELAY_SECONDS:-2}"
  if ! check_e2e_web_reachable; then
    echo "Isolated wg-studio-web is not reachable from the API container; aborting E2E run." >&2
    exit 1
  fi

  e2e_compose run --rm wg-studio-e2e npm run test:e2e "$@"
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
    run_isolated_e2e "$@"
    ;;
  cli)
    docker compose --profile tools run --rm wg-studio-cli "$@"
    ;;
  e2e)
    run_isolated_e2e "$@"
    ;;
  backup-db)
    ./scripts/backup-db.sh "$@"
    ;;
  restore-db)
    ./scripts/restore-db.sh "$@"
    ;;
  export-state)
    ./scripts/export-state.sh "$@"
    ;;
  import-state)
    ./scripts/import-state.sh "$@"
    ;;
  *)
    echo "Unsupported command '$command_name'. Use: up, build, restart, down, ps, logs, wait, health, smoke, cli, e2e, backup-db, restore-db, export-state, import-state." >&2
    exit 1
    ;;
esac
