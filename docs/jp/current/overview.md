# 概要

目的:

- `wg-studio` が今どんな製品か
- 何ができて、何をまだやらないか
を短く把握するためのページです。

想定読者:

- 現行機能をざっと把握したい運用者
- 詳しい資料へ入る前に全体像を掴みたい開発者

関連資料:

- [`architecture.md`](architecture.md)
- [`domain-model.md`](domain-model.md)
- [`config-and-apply.md`](config-and-apply.md)
- [`../planning/roadmap.md`](../planning/roadmap.md)

`wg-studio` は、WireGuard の desired state をデータプレーンの外側で管理するコントロールプレーンです。

![Dashboard スクリーンショット](../../image/dashboard.png)

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
- drift 検出時に Dashboard からそのまま適用できる操作導線
- まだ表示またはダウンロードしていない peer 設定の案内表示
- GUI 操作ログと WireGuard 状態表示

非目標:

- 1 つの control plane 内での multi-instance orchestration
- multi-tenant 対応
- WebSocket ベースのリアルタイム配信

スコープメモ:

- `v1.0.0` では `Instance` モデルは導入しません
- `wg1` や `wg2` のような分離は、別コンテナまたは別 `wg-studio` スタックで扱う前提です
