# Scripts

Use this folder for host-side operator and development helpers.

## Stack Wrappers

- `stack.sh`
  - thin shell wrapper around common Docker Compose flows
  - includes logical targets such as `core`, `runtime`, `api`, `web`, and `db`
  - also exposes wrapper commands for `health`, `smoke`, `backup-db`, `restore-db`, `export-state`, `import-state`, and `pytest`
- `stack.ps1`
  - PowerShell equivalent of `stack.sh`

## Backup And State Transfer

- `backup-db.sh`
  - create PostgreSQL full dumps under `backups/db/`
- `restore-db.sh`
  - restore PostgreSQL dumps back into the normal stack
- `export-state.sh`
  - export logical control-plane state into `backups/state/`
- `import-state.sh`
  - import logical control-plane state from JSON

## Safe Test Entry Points

- `pytest-safe.sh`
  - boot the isolated `docker-compose.test.yml` stack
  - create dedicated test databases
  - run pytest only against `*_test` database names

## Git Helper

- `push-and-sync.ps1`
  - push the current branch, then refresh the local remote-tracking ref so `origin/<branch>` immediately reflects the pushed state

## Deploy Helper

- `deploy.sh`
  - run on the deployment server
  - fast-forward pull the target branch, validate compose, then recreate the stack
- `migrate-db.sh`
  - run the checked-in Alembic migrations through the API container
  - useful before or after a profile/auth schema rollout if you want an explicit migration step
