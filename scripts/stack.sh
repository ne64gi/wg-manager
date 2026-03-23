#!/usr/bin/env sh
set -eu

command_name="${1:-up}"
shift || true

case "$command_name" in
  up)
    docker compose up -d --build "$@"
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
  cli)
    docker compose --profile tools run --rm wg-studio-cli "$@"
    ;;
  e2e)
    docker compose --profile test run --rm wg-studio-e2e "$@"
    ;;
  *)
    echo "Unsupported command '$command_name'. Use: up, down, ps, logs, cli, e2e." >&2
    exit 1
    ;;
esac
