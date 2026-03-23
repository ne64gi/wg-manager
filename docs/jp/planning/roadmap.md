# Roadmap

このページは、`v1.0.0` のリリース境界と、その後の育て方を人間向けに整理したものです。

## 現在のリリース境界

### 対象バージョン

- `v1.0.0`

### ゴール

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

## `v1.0.0` 以降の進め方

`1.x` は、何でも先に足すのではなく、順番を守って地盤を固める前提です。

### 現在の `1.x` の順番

1. `1.1`: Runtime separation
2. `1.2`: Frontend modernization prep
3. `1.3`: UX / visibility improvements
4. `1.4`: Authorization and audit hardening

意味としてはこうです。

- 先に中身の分離を進める
- 次にフロントを Next へ移しやすい構造に寄せる
- その上で運用 UX と可視化を強くする
- 認可と監査の本格強化は、その後に行う
- ただし `1.1` の段階で、no-op plugin や最小 action vocabulary、authz decision をログへ流せる入口だけは先に作ってよい
- deny / allow の本格運用や広い認可適用は、後半の hardening フェーズへ回す
- `1.2` 中にネットワーク図のような可視化を試す場合は、軽い構造ビューに留める
- 将来 layered override を持つ設定値は、route や runtime code に優先順位を散らさず、config 生成前の共有 resolver で解決する方針にする
- MTU はその最初の例として扱う:
  - `1.2.x` では interface 既定値だけを保持する
  - 将来は group, user, peer override の追加を想定する
  - 優先順位解決は runtime adapter の外側に置く

### `1.x` を横断する品質トラック

これは特定の版テーマではなく、各版に並走させる品質改善です。

- Playwright の段階的な拡張
- ZIP bundle の検証
- JSON export / import の round-trip 検証
- mobile workflow の確認
- auth expiration / apply error の失敗経路確認
- 翻訳漏れの修正
- 用語や表現の揺れの解消
- docs と UI の表現合わせ

## `v1.0.0` 以降にやりたいこと

- グラフや Grafana 向けの状態履歴
- グラフのクリック拡大などの操作改善
- `Group -> User -> Peer` を見る Cytoscape.js ベースのトポロジー表示
- Discord や LINE などの通知連携
- ログ UI の改善
- セキュリティ強化
- Playwright を smoke から段階的に広げる
- 家庭 VPN / チーム VPN / 小規模オフィス VPN のようなユースケース docs
- 短い GIF やスクリーンショット中心の視覚的な操作ガイド

## `v1.0.0` 以降の育て方

`v1.0.0` の後は、次の順番で育てていく想定です。

### `1.x.x`

テーマ: `Safe single-runtime operations`

- 小規模管理
- 現状の地盤強化
- 認可の土台、監査ログ、diff 表示、安全な apply、履歴、backup / restore、GUI 導線整理を進める
- Linux 依存の runtime 制御は早めに adapter 的な境界の内側へ押し込み、将来の移植性に備える
- フロントは Next へ移りやすいよう、routing、data fetching、browser 依存、再利用 UI の責務分離を先に進める
- MTU のように後から layered override を持ちうる設定値は、config rendering 前の service 層で一度だけ解決する形を守る
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

AI 向けの低曖昧度な版管理や実装順序は [`../../ai/roadmap.md`](../../ai/roadmap.md) を参照してください。
