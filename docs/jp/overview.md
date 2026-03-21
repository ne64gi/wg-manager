# 概要

`wg-studio` は、WireGuard の desired state をデータプレーンの外側で管理するコントロールプレーンです。

保持する主な対象:

- Group
- User
- Peer
- ログインユーザー
- GUI 設定
- エンドポイント設定

基本構造:

- `Group -> User -> Peer`

現在の主な機能:

- PostgreSQL を正本にした状態管理
- Group / User / Peer のライフサイクル管理
- WireGuard サーバー設定と peer 設定の生成
- `syncconf` による反映
- 一回限りの reveal と QR 表示
- reveal モーダルからの `.conf` / QR ダウンロード
- Group 単位 / User 単位の bundle ZIP 出力
- 現在状態の JSON export / import
- Dashboard での apply 状態と drift 状態の表示
- GUI 操作ログと WireGuard 状態表示

非目標:

- 1 つの control plane 内での multi-instance orchestration
- multi-tenant 対応
- WebSocket ベースのリアルタイム配信

スコープメモ:

- `v1.0.0` では `Instance` モデルは導入しません
- `wg1` や `wg2` のような分離は、別コンテナまたは別 `wg-studio` スタックで扱う前提です
