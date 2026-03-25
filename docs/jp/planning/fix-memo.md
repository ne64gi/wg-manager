🔥 1. wg0存在前提問題（最重要）
現状
runtime が wg0 前提で動く
無いと 何も起きない or 謎挙動
問題
初期構築 / 事故復旧 / volume消失
→ wg0 消える
→ applyしても復元されない
対策

👉 runtimeにこれ必須

wg show or ip link で存在確認

無ければ：

ip link add wg0 type wireguard
ip addr add <server_address> dev wg0
wg setconf wg0 <config>
ip link set wg0 up
設計的には

👉 「desired state = interface含める」




🔥 2. Addressドリフト検出
現状
Address = 20.88.61.1/24 ←ゴミ

でも runtime は気づかない

問題
config正しくても runtimeズレる
unreachable地獄
対策

👉 apply時に必ず比較

ip -4 addr show wg0

と config の Address 比較

違ったら

ip addr flush dev wg0
ip addr add <correct> dev wg0




🔥 3. ルーティング自動補正（今回の本丸）
現状
10.88.61.5 → ens3
問題
WGの通信なのに外に出る
一番ハマるやつ
対策

👉 apply後に必ず入れる

ip route replace <network_cidr> dev wg0
さらに良くするなら
ip route get <peer_ip>

で dev が wg0 かチェック




🔥 4. Docker APIバージョン固定問題
現状
/v1.41/
問題
client version 1.41 is too old
対策（必須）

👉 バージョン直書き禁止

方法①（簡単）
/v1.44/
方法②（正解）
DOCKER_API_VERSION 環境変数 or 動的取得

例：

docker version --format '{{.Server.APIVersion}}'



🔥 5. wg0削除時のリカバリ設計
現状
ip link delete wg0
→ 永遠に復活しない
問題
コンテナ再起動では復元されない
UX最悪
対策

👉 entrypoint or healthcheckで

wg0存在チェック
無ければ recreate



🔥 6. AllowedIPs と routingの非対称問題
現状
AllowedIPs = 10.88.61.5/32

でも routing が壊れてると死ぬ

問題
WG的にはOK
OS的にはNG
対策

👉 runtimeで

peer追加時に routeも強制



🔥 7. nftables テーブル名依存問題
現状
inet filter ← 存在しない
cfguard ← 実際
問題
環境依存でコケる
対策

👉 動的検出

nft list tables

or

👉 wg-studio専用table作る（推奨）

table inet wgstudio




🔥 8. host network + container責務曖昧問題
現状
WGはhost側に影響
でも操作はcontainerから
問題
状態が「外」にある
docker restartで整合崩れる
対策

👉 明確に分ける

パターンA（今）
container → host操作
パターンB（おすすめ）

👉 hostにagent置く（systemd）
→ containerはAPIだけ



🔥 9. ICMP頼りすぎ問題
現状

pingで判断

問題
Windows FWで普通に死ぬ
対策

👉 ヘルスチェックAPI用意

GET /health

or

nc / curl



🔥 10. MTU初期値問題
現状

忘れてた

問題
通信できるのに不安定
対策

👉 デフォルト埋める

MTU = 1380〜1420

or

👉 自動計算

🔥 まとめ（優先順位）
Sランク（絶対やれ）
wg0存在チェック & 自動生成
route自動補正
Docker API version動的化
Aランク
Addressドリフト検出
wg0削除復旧
Bランク
nftables動的対応
MTUデフォルト
Cランク
ICMP依存排除
アーキ分離（agent化）
一言でいうと

👉 今のwg-studioは「構成管理ツール」止まり

ここ直すと

👉 「完全なネットワークコントロールプレーン」になる