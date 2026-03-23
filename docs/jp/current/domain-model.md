# ドメインモデル

## Group

Group は最上位のセグメント単位です。

責務:

- `/8`、`/16`、`/24` のようなネットワークを持つ
- 既定の `AllowedIPs` を定義する
- 任意の `dns_servers` を定義する
- `allocation_start_host` で自動 IP 割り当て開始位置を決める
- `reserved_ips` で除外 IP を永続的に定義する

現在の scope 慣例:

- `admin`: `/8`
- `multi_site`: `/16`
- `single_site`: `/24`

IP 設計メモ:

- group network は配下 peer すべての割り当て境界です
- scope に応じて必要な group prefix 長が決まります
- peer の IP は親 group network に属していなければなりません
- 入力された CIDR に host bits があっても、保存前に正規化されます
- `v1.0.0` では `Group` が最上位の IP 設計単位で、追加の `Instance` レイヤーはありません

## User

User は Group に属し、group 既定ルートを継承するか個別に上書きできます。

責務:

- 人または論理的な所有者を表す
- 必要なら `allowed_ips_override` を持つ
- 複数の peer を所有する

アクセス解決順:

1. `User.allowed_ips_override` があればそれを使う
2. なければ `Group.default_allowed_ips` を使う

## Peer

Peer は 1 台の具体的な端末、または 1 つの接続単位です。

責務:

- 割り当て済み VPN IP を持つ
- WireGuard 鍵素材を持つ
- 設定生成に参加する
- ライフサイクル情報と状態情報を外へ出す

主なライフサイクル項目:

- `created_at`
- `updated_at`
- `revoked_at`
- `last_config_generated_at`
- `is_active`

主な操作:

- create
- revoke
- delete

削除ポリシー:

- `peer delete`: 物理削除
- `user delete`: peer を cascade して物理削除
- `group delete`: user と peer を cascade して物理削除

## 割り当てポリシー

自動 IP 割り当ては group 単位で行います。

ルール:

- `allocation_start_host` が探索開始位置
- `reserved_ips` は常に除外
- network address と broadcast address は割り当てません
- 手動 `assigned_ip` も同じ検証ルールを使います
- 割り当ては整数ベースで行い、`/8`、`/16`、`/24` に対応します
- user は subnet を持たず、ルートの継承または上書きだけを行います
- peer は親 group network の中にある 1 つの具体的な VPN IP を持ちます
