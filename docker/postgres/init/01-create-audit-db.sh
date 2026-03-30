#!/usr/bin/env sh
set -eu

audit_db="${POSTGRES_AUDIT_DB:-wg_studio_audit}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOF
SELECT 'CREATE DATABASE "${audit_db}"'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = '${audit_db}'
)\gexec
EOF
