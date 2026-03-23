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

## `v1.0.0` 以降の育て方

`v1.0.0` の後は、次の順番で育てていく想定です。

### `1.x.x`

テーマ: `Safe single-runtime operations`

- 小規模管理
- 現状の地盤強化
- 認可の土台、監査ログ、diff 表示、安全な apply、履歴、backup / restore、GUI 導線整理を進める
- Linux 依存の runtime 制御は早めに adapter 的な境界の内側へ押し込み、将来の移植性に備える
- 目標: 1 台の WireGuard runtime を複数人が安心して触れる状態にする

### `2.x.x`

テーマ: `Scoped multi-runtime operations`

- 大規模管理
- マルチサーバー / マルチテナント対応
- 境界、所有権、責務の分離を主題にしてデータモデルを広げる
- 目標: 複数 runtime や複数 tenant を、明確に分離しながら管理できるようにする

### `3.x.x`

テーマ: `Autonomous and integrated operations`

- 自動運用・外部連携
- SSO、通知、外部 API 連携、自動失効、半自律運用のような世界へ進める
- 目標: 境界と監査が整った前提で、人手の運用負荷を下げる

短く言うと:

- `1.x.x`: 小規模管理（現状の地盤強化）
- `2.x.x`: 大規模管理（マルチサーバー / マルチテナント化）
- `3.x.x`: 自動運用・外部連携（統合と半自律化）
