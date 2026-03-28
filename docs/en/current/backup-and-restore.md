# Backup And Restore

`wg-studio` separates `PostgreSQL full backup/restore` for recovery from `state export/import` for logical transfer.

## Which One To Use

- `DB backup/restore`
  - primary recovery path
  - includes `login_users`, sessions, audit data, and traffic history
- `state export/import`
  - logical transfer path
  - good for groups, users, peers, and server/gui settings
  - not a full replacement for auth/session or audit recovery

## Operator Rule

- always take a full DB backup with `scripts/backup-db.sh` before any destructive DB work
- destructive DB work includes restore, state import, manual SQL, migration verification, and any test run pointed at a real DB
- `state export` is not a substitute for recovery-grade backup, so prefer `DB backup` first whenever the database may change

## Host Scripts

- `scripts/backup-db.sh`
  - writes `pg_dump -Fc` files under `backups/db/`
- `scripts/restore-db.sh --main <dump> [--audit <dump>] --yes`
  - restores DB dumps
  - destructive, so `--yes` is required
- `scripts/export-state.sh`
  - writes JSON state under `backups/state/`
- `scripts/import-state.sh --input <json> --yes`
  - imports JSON state
  - destructive, so `--yes` is required

## Example

```sh
./scripts/backup-db.sh
./scripts/export-state.sh
./scripts/restore-db.sh --main backups/db/wg-studio-20260328-220000.dump --audit backups/db/wg-studio-audit-20260328-220000.dump --yes
./scripts/import-state.sh --input backups/state/wg-studio-state-20260328-220000.json --yes
```

## Notes

- none of these flows are exposed in the GUI
- `restore-db.sh` stops `wg-studio-api` and `wg-studio-web` before restore, then starts them again
- `pgtools` and `wg-studio-cli` run through the Compose `tools` profile
