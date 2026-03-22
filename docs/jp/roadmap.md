# Roadmap

## 対象バージョン

- `v1.0.0`

## ゴール

WireGuard peer を Web UI から安全に作成・管理・適用でき、状態の整合性が分かりやすく、運用負荷が低いこと。

## `v1.0.0` に含めるもの

- peer 管理: create / delete / revoke
- `Group -> User -> Peer` 構造
- `wg0.conf` と peer 設定生成
- `syncconf` による apply
- JWT 認証
- one-time reveal
- Dashboard の概要表示
- polling ベースの状態更新
- `401` 時のログアウトとログイン画面遷移
- apply 状態と drift 状態の可視化
- reveal モーダルからのダウンロード
- group / user 単位の bundle ZIP
- JSON export / import
- GUI 操作ログ
- peer のオンライン / traffic / handshake 状態

## `v1.0.0` に含めないもの

- 1 つの control plane 内での multi-instance orchestration
- `Instance` モデルの導入
- multi-tenant 対応
- WebSocket ベースの realtime
- 高度な RBAC
- E2E テスト一式

## リリース条件

以下がすべて満たされれば `v1.0.0` として完了扱い:

- Included の項目が動作している
- peer create / delete / apply に致命的不具合がない
- Dashboard で drift 状態が理解できる
- reveal モーダルで設定をダウンロードできる
- bundle ZIP と JSON export / import が通る
- login / logout / token expiration が安定している
- 再起動後に状態不整合が起きない

## `v1.0.0` 以降にやりたいこと

- グラフや Grafana 向けの状態履歴
- グラフのクリック拡大などの操作改善
- Discord や LINE などの通知連携
- ログ UI の改善
- セキュリティ強化
- Playwright を smoke から段階的に広げる
