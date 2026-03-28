# バックアップとリストア

`wg-studio` では、復旧用の `PostgreSQL full backup/restore` と、論理移送用の `state export/import` を分けて扱います。

## 使い分け

- `DB backup/restore`
  - 事故復旧の本命です
  - `login_users`、session、audit、traffic history を含めて戻せます
- `state export/import`
  - 論理データの移送用です
  - グループ、ユーザー、peer、server/gui settings の持ち運びに向きます
  - GUI login session や監査ログの完全復旧には向きません

## 運用ルール

- DB に対して破壊的変更を行う前は、必ず `scripts/backup-db.sh` で full backup を取得してください
- ここでいう破壊的変更には、restore、state import、手動 SQL、migration 検証、本番 DB に触れる test 実行を含みます
- `state export` だけでは事故復旧の代わりにならないので、DB を触る前の保険としては必ず `DB backup` を優先してください

## Host Scripts

- `scripts/backup-db.sh`
  - `backups/db/` に `pg_dump -Fc` を保存します
- `scripts/restore-db.sh --main <dump> [--audit <dump>] --yes`
  - DB dump を戻します
  - 破壊的なので `--yes` 必須です
- `scripts/export-state.sh`
  - `backups/state/` に JSON state を保存します
- `scripts/import-state.sh --input <json> --yes`
  - JSON state を取り込みます
  - 破壊的なので `--yes` 必須です

## 例

```sh
./scripts/backup-db.sh
./scripts/export-state.sh
./scripts/restore-db.sh --main backups/db/wg-studio-20260328-220000.dump --audit backups/db/wg-studio-audit-20260328-220000.dump --yes
./scripts/import-state.sh --input backups/state/wg-studio-state-20260328-220000.json --yes
```

## 補足

- どの機能も GUI には出していません
- `restore-db.sh` は restore 前に `wg-studio-api` と `wg-studio-web` を停止し、完了後に再起動します
- `pgtools` と `wg-studio-cli` は Compose の `tools` profile で動きます
