# アーキテクチャ

現在のパッケージ構成は次の通りです。

- `app/api`: FastAPI のエントリポイントと HTTP ルート
- `app/cli`: 管理者向け / 開発向け Typer エントリポイント
- `app/core`: 実行時設定
- `app/db`: SQLAlchemy の engine と session
- `app/models`: ドメインモデルと監査ログモデル
- `app/schemas`: API / service 用スキーマ
- `app/services`: ドメインロジック、生成、適用、状態取得、監査

`docker-compose.yml` にある実行サービス:

- `postgres`: メイン DB と監査ログ DB
- `wg-studio-api`: 内部 Docker ネットワーク上の FastAPI サービス
- `wireguard`: `wg-studio` から制御される薄い runtime コンテナ
- `wg-studio-web`: `nginx` 経由で配信される GUI

profile 付きの補助サービス:

- `wg-studio-cli`: 内部 Docker ネットワーク上の管理 / 開発用コンテナ（`tools`）
- `wg-studio-e2e`: Playwright smoke 実行用の隔離 stack

セキュリティを意識した実行時の選択:

- API はデフォルトでホストポートに公開しません
- 生成 artifact は共有 Docker volume `wg_config` に保存されます
- API と CLI は内部 Docker ネットワーク上で通信します
- 実際の `.env` はローカル専用のまま運用する前提です

現在の状態取得は、Docker exec と `wg show ... dump` を使って live な WireGuard runtime を読み取ります。
