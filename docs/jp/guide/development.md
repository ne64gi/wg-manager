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
- `1.1.5` 時点で対応している adapter は `docker_container` のみです
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
- browser E2E は隔離された `docker-compose.e2e.yml` を使います
- pytest は隔離された `docker-compose.test.yml` を使います

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
./scripts/stack.sh wait
./scripts/stack.sh health
./scripts/stack.sh smoke
./scripts/stack.sh cli group list
./scripts/stack.sh e2e
```

PowerShell では:

```powershell
pwsh ./scripts/stack.ps1 up
pwsh ./scripts/stack.ps1 up runtime
pwsh ./scripts/stack.ps1 build api
pwsh ./scripts/stack.ps1 wait
pwsh ./scripts/stack.ps1 health
pwsh ./scripts/stack.ps1 smoke
pwsh ./scripts/stack.ps1 cli group list
pwsh ./scripts/stack.ps1 e2e
```

`up` / `build` / `restart` では、次の論理ターゲットを使えます。

- `core`
- `runtime`
- `api`
- `web`
- `db`

追加された wrapper コマンド:

- `wait`
  - 後続の operator コマンドを流す前に、API health が通るまで待機します
- `health`
  - compose の状態表示に加えて、API の readiness と web 到達性までまとめて確認します
- `smoke`
  - 本番 stack とは別の隔離 compose を起動してから Playwright smoke suite を実行します

push 後に remote-tracking ref まで更新して確認する:

```powershell
pwsh ./scripts/push-and-sync.ps1
```

`git push` 自体は成功していても、手元の `origin/main` 表示は `git fetch`
するまで古いままに見えることがあります。このスクリプトはそこまでまとめて行います。

テスト実行:

```bash
./scripts/pytest-safe.sh -q
```

`pytest-safe.sh` は隔離された `docker-compose.test.yml` を起動し、専用 test DB を作成した上で、本番向け DB 名では起動しないようにしています。

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

推奨される wrapper-first の smoke 実行:

```bash
./scripts/stack.sh smoke
```

または Docker Compose を直接使う場合:

```bash
docker compose -f docker-compose.e2e.yml -p wg-studio-e2e up -d --build
docker compose -f docker-compose.e2e.yml -p wg-studio-e2e run --rm wg-studio-e2e npm run test:e2e
docker compose -f docker-compose.e2e.yml -p wg-studio-e2e down -v
```

環境メモ:

- wrapper の `smoke` コマンドは、隔離 stack を起動してから bounded な readiness wait を実行します
- ログインユーザーが 0 件なら、smoke suite は setup 画面から最初の管理者を作成します
- すでにログインユーザーがある場合は、その資格情報が正しい前提で動きます
- browser E2E は隔離された PostgreSQL と artifact volume を使うので、通常運用の DB や config には触れません
- ホスト側に Node と Playwright があれば `npm run test:e2e` も使えます
