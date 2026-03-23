# 開発

目的:

- ローカル開発時の基本的な起動と検証の流れをまとめる

## 環境

ローカルの `.env` は `.env.example` をひな形に使います。

重要な既定値の例:

- PostgreSQL 接続 URL
- 初期 endpoint address と port
- WireGuard container / runtime の接続先
- artifact root

現時点の runtime 境界メモ:

- `WG_RUNTIME_ADAPTER` は runtime 選択の入口として用意しています
- `1.1.3` 時点で対応している adapter は `docker_container` のみです
- 目的は早い段階で runtime 依存を分離することであり、まだ完全な cross-platform 対応ではありません

実際の `.env` はローカル専用で保持してください。

## 標準スタック

このプロジェクトは Docker 内で動かす前提です。

標準サービス:

- `postgres`
- `wg-studio-api`
- `wireguard`
- `wg-studio-web`

profile 付きの補助サービス:

- `wg-studio-cli`（`tools`）
- `wg-studio-e2e`（`test`）

主な実行時の特徴:

- API と CLI は内部 Docker ネットワーク上にあります
- 生成 artifact は `wg_config` に保存されます
- PostgreSQL の状態は `postgres_data` に保存されます

## よく使うコマンド

スタック起動:

```bash
docker compose up -d --build
```

スタック内から API の health を確認:

```bash
docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

CLI コマンド実行:

```bash
docker compose --profile tools run --rm wg-studio-cli group list
```

起動入口整理の下準備として、薄い wrapper も使えます。

```bash
./scripts/stack.sh up
./scripts/stack.sh up runtime
./scripts/stack.sh build api
./scripts/stack.sh cli group list
./scripts/stack.sh e2e
```

PowerShell では:

```powershell
pwsh ./scripts/stack.ps1 up
pwsh ./scripts/stack.ps1 up runtime
pwsh ./scripts/stack.ps1 build api
pwsh ./scripts/stack.ps1 cli group list
pwsh ./scripts/stack.ps1 e2e
```

`up` / `build` / `restart` では、次の論理ターゲットを使えます。

- `core`
- `runtime`
- `api`
- `web`
- `db`

push 後に remote-tracking ref まで更新して確認する:

```powershell
pwsh ./scripts/push-and-sync.ps1
```

`git push` 自体は成功していても、手元の `origin/main` 表示は `git fetch`
するまで古いままに見えることがあります。このスクリプトはそこまでまとめて行います。

テスト実行:

```bash
docker compose --profile tools run --rm \
  -e DATABASE_URL=sqlite:////tmp/wg-studio-test.db \
  -e LOG_DATABASE_URL=sqlite:////tmp/wg-studio-log-test.db \
  -e ARTIFACT_ROOT=/tmp/generated \
  --entrypoint pytest \
  wg-studio-cli /app/tests -q
```

テストでは速度と分離のために一時 SQLite を使います。通常運用のスタックでは PostgreSQL を使います。

## ブラウザ E2E の方針

`v1.0.0` では、リリース信頼性のために最小の Playwright smoke suite だけを入れる方針です。

推奨 smoke 対象:

- login
- `Group -> User -> Peer` 作成
- reveal モーダルの表示とダウンロード導線
- apply フローと Dashboard の sync-state 表示
- Logs 画面の読み込み、フィルター、ページング

`v1.0.0` 後は、一度に全部を網羅するのではなく、少しずつ Playwright を広げます。

## ブラウザ E2E コマンド

ローカルで frontend のテスト依存を入れる:

```bash
cd frontend
npm install
npx playwright install chromium
```

Docker Compose 経由で release smoke を実行:

```bash
docker compose --profile test run --rm \
  -e E2E_BASE_URL=http://wg-studio-web/wg-studio/ \
  -e E2E_USERNAME=admin \
  -e E2E_PASSWORD=supersecret123 \
  wg-studio-e2e
```

環境メモ:

- ログインユーザーが 0 件なら、smoke suite は setup 画面から最初の管理者を作成します
- すでにログインユーザーがある場合は、その資格情報が正しい前提で動きます
- テストは一意な Group / User / Peer 名を作成しますが、現時点では自動 cleanup はしません
- ホスト側に Node と Playwright があれば `npm run test:e2e` も使えます
