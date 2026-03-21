# 開発

## 環境

ローカルの `.env` は `.env.example` をひな形に使います。

重要な既定値の例:

- PostgreSQL 接続 URL
- 初期 endpoint address と port
- WireGuard container / runtime の接続先
- artifact root

実際の `.env` はローカル専用で保持してください。

## 標準スタック

このプロジェクトは Docker 内で動かす前提です。

標準サービス:

- `postgres`
- `wg-studio-api`
- `wg-studio-cli`
- `wireguard`

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
docker compose run --rm wg-studio-cli group list
```

テスト実行:

```bash
docker compose run --rm \
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
docker compose run --rm \
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
