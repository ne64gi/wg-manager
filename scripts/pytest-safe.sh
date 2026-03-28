#!/usr/bin/env sh
set -eu

[ -f ./.env ] && set -a && . ./.env && set +a

test_db="${WG_STUDIO_TEST_DB:-wg_studio_test}"
test_audit_db="${WG_STUDIO_TEST_AUDIT_DB:-wg_studio_audit_test}"

create_sql="
SELECT 'CREATE DATABASE ${test_db}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${test_db}')\\gexec
SELECT 'CREATE DATABASE ${test_audit_db}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${test_audit_db}')\\gexec
"

docker compose --profile tools run --rm -T wg-studio-pgtools \
  "printf '%s\n' \"${create_sql}\" | psql -h postgres -U \"${POSTGRES_USER}\" -d postgres"

docker compose --profile tools run --rm -T \
  -e DATABASE_URL="postgresql+psycopg://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/${test_db}" \
  -e LOG_DATABASE_URL="postgresql+psycopg://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/${test_audit_db}" \
  -v "$(pwd)/app:/app/app:ro" \
  -v "$(pwd)/tests:/app/tests:ro" \
  -v "$(pwd)/VERSION:/app/VERSION:ro" \
  wg-studio-api \
  python -m pytest "$@"
