#!/usr/bin/env sh
set -eu

test_db="${WG_STUDIO_TEST_DB:-wg_studio_test}"
test_audit_db="${WG_STUDIO_TEST_AUDIT_DB:-wg_studio_audit_test}"
test_db_user="${WG_STUDIO_TEST_DB_USER:-wgstudio}"
test_db_password="${WG_STUDIO_TEST_DB_PASSWORD:-wgstudio}"
repo_root="$(pwd)"
app_dir="${repo_root}/app"
tests_dir="${repo_root}/tests"

if [ ! -d "${app_dir}" ] || [ ! -f "${app_dir}/__init__.py" ]; then
  echo "Expected app source under ${app_dir}" >&2
  exit 1
fi

if [ ! -d "${tests_dir}" ] || ! find "${tests_dir}" -maxdepth 1 -name 'test_*.py' | grep -q .; then
  echo "Expected pytest files under ${tests_dir}" >&2
  exit 1
fi

test_compose() {
  docker compose -f docker-compose.test.yml -p wg-studio-test "$@"
}

create_sql="
SELECT 'CREATE DATABASE ${test_db}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${test_db}')\\gexec
SELECT 'CREATE DATABASE ${test_audit_db}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${test_audit_db}')\\gexec
"

test_compose up -d postgres >/dev/null

cleanup() {
  test_compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

test_compose run --rm -T wg-studio-pgtools \
  "export PGPASSWORD='${test_db_password}'; printf '%s\n' \"${create_sql}\" | psql -h postgres -U \"${test_db_user}\" -d postgres"

test_compose run --rm -T \
  -v "${app_dir}:/app/app:ro" \
  -v "${tests_dir}:/app/tests:ro" \
  -e DATABASE_URL="postgresql+psycopg://${test_db_user}:${test_db_password}@postgres:5432/${test_db}" \
  -e LOG_DATABASE_URL="postgresql+psycopg://${test_db_user}:${test_db_password}@postgres:5432/${test_audit_db}" \
  wg-studio-pytest "$@"
