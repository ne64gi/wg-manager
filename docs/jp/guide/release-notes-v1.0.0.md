# リリースノート: `v1.0.0`

`wg-studio v1.0.0` は、`Group -> User -> Peer` を軸にした WireGuard コントロールプレーンとしての最初の安定版です。

## 主な内容

- Group、User、Peer、ログインユーザー、設定を PostgreSQL で管理
- JWT ベースのログインとリフレッシュを持つ FastAPI API
- `nginx` 経由で `3900` 番ポートに公開される React/Vite GUI
- QR 付きの one-time peer reveal と直接ダウンロード
- 注意確認つきの Group / User 単位 peer bundle export
- 現在状態の JSON export / import
- Dashboard での適用状態と runtime drift の可視化
- 生成した `wg0.conf` を使う WireGuard apply フロー
- GUI の操作ログと peer runtime 状態表示
- リリース確認用の最小 Playwright smoke テスト

## 運用メモ

- `v1.0.0` は 1 スタックにつき 1 WireGuard runtime を扱います
- `wg1` のような別 runtime や別環境が必要な場合は、別コンテナまたは別 `wg-studio` stack を立ててください
- `未表示のピア設定` は情報表示であり、それ自体は drift ではありません
- `適用が必要です` は runtime drift がある場合だけ表示されます

## ドキュメント案内

- 運用者はまず [`quick-start.md`](quick-start.md) から読むのがおすすめです
- 詳しい挙動は [`../current/overview.md`](../current/overview.md)、[`../current/config-and-apply.md`](../current/config-and-apply.md)、[`../current/auth-and-api-rules.md`](../current/auth-and-api-rules.md) にあります
- AI 作業者は変更前に [`../ai/README.md`](../ai/README.md) を読む前提です

## `v1.0.0` 以降にやりたいこと

- グラフと履歴表示の改善
- トラフィックや状態グラフのクリック拡大
- Playwright 回帰テストの拡張
- `v1.1+` の認可基盤整備
