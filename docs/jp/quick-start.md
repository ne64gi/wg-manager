# クイックスタート

## 1. 環境変数を用意する

```bash
cp .env.example .env
```

最低限見直す値:

- `WG_SERVER_ENDPOINT`
- `WG_JWT_SECRET_KEY`

初回ログインを自動作成したい場合:

- `WG_BOOTSTRAP_ADMIN_USERNAME`
- `WG_BOOTSTRAP_ADMIN_PASSWORD`

## 2. スタックを起動する

```bash
docker compose up -d --build
```

## 3. GUI を開く

```text
http://localhost:3900/wg-studio/
```

## 4. 初回ログイン

- bootstrap 管理者を環境変数で設定している場合は、そのユーザーでログインします
- ログインユーザーが 0 件の場合は、ログイン画面が初回管理者作成モードに切り替わります

## 5. 最初の運用フロー

1. Group を作成する
2. User を作成する
3. Peer を作成する
4. 必要なら `Reveal` で設定を表示し、`.conf` または QR をダウンロードする
5. `Apply` で WireGuard ランタイムに反映する
6. Dashboard でドリフト状態と通信状態を確認する

## 補足

- `wg-studio` `v1.0.0` は 1 スタックにつき 1 WireGuard ランタイム前提です
- `wg1` や別系統のランタイムを持ちたい場合は、別コンテナまたは別 `wg-studio` スタックで分けて運用します
