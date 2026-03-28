# 2026-03-28 Production DB Reset Incident

## What happened

- a pytest run was executed against the normal operator database
- multiple test modules call `reset_db()` and use `drop_all()` / `create_all()`
- this replaced production `login_users` and desired state tables with test fixture data

## Recovery source of truth

- runtime `wg show`
- `/config/wg_confs/wg0.conf`
- `/config/peers/*.conf`
- retained SQL dumps under `recovery/2026-03-28/` during the incident window

## Follow-up hardening added after the incident

- mandatory operator rule: take `scripts/backup-db.sh` before destructive DB work
- host scripts for:
  - DB backup
  - DB restore
  - state export
  - state import
- `restore-db.sh --dry-run --yes` preflight
- `tests/conftest.py` guard that blocks pytest against non-test databases
- `scripts/pytest-safe.sh` as the supported pytest entrypoint with dedicated `*_test` databases

## Remaining operator note

- if runtime and DB ever diverge again, do not apply immediately
- first capture `wg show`, `wg0.conf`, peer artifacts, and a DB dump
