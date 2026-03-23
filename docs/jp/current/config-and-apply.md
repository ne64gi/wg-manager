# 設定生成と適用

## 生成される artifact

現在の実装で生成されるもの:

- server config: `/wg/config/wg_confs/wg0.conf`
- peer config: `/wg/config/peers/<peer>.conf`
- peer QR: `/wg/config/peers/<peer>.svg`
- bundle archive: メモリ上で生成して ZIP ダウンロードとして返却

標準の Compose 構成では、これらは共有 Docker volume `wg_config` に保存されます。

## Peer 設定ルール

- `Group.dns_servers` が空なら `[Interface] DNS` は出力しません
- group DNS があれば `[Interface] DNS` を出力します
- `[Peer] PersistentKeepalive = 25` は常に出力します
- endpoint address と port は `initial_settings` の singleton から取得します

有効な `AllowedIPs` はアクセス解決結果から決まります。

1. `User.allowed_ips_override`
2. なければ `Group.default_allowed_ips`

## Server 設定ルール

- active な peer だけを含めます
- 各 peer は `AllowedIPs = <assigned_ip>/32` で出力します

## 適用フロー

`wg-studio` は薄い WireGuard コンテナを経由して server config を適用します。

現在の流れ:

1. 新しい `wg0.conf` を生成する
2. `wg0` が存在しなければ `wg-quick up` を実行する
3. `wg0` がすでに存在すれば `wg-quick strip ... | wg syncconf ...` を実行する

書き込みは一時ファイル + replace で原子的に行ってから適用します。

## Bundle フロー

Group 単位 / User 単位の bundle ダウンロードは秘密情報の再配布イベントとして扱います。

現在の流れ:

1. GUI で bundle warning を取得する
2. オペレーターが warning を確認する
3. 対象の active peer を再生成する
4. 再生成した peer artifact を reveal 扱いで ZIP にまとめる
5. 新しい peer ファイルを配布する前に、更新済み server config を適用する

bundle の中身:

- 各 peer の `.conf`
- 各 peer の `.svg`
- `NOTICE.txt`
