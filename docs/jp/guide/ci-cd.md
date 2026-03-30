# CI / Deploy

目的:

- GitHub Actions または Gitea Actions を使う時の、安全な deploy 境界を整理する

## deploy 境界

環境依存の実ファイルはサーバー側に残します。

- `.env`
- `docker-compose.override.yml`
- `backups/`

Git に置くのはひな形だけにします。

- `.env.example`
- `docker-compose.override.example.yml`

workflow 側は repository をテストした後、deploy 先へ SSH して、repo に入っている deploy script を実行するだけにします。

## サーバー側の前提

deploy 先サーバーには、事前に次が必要です。

- `wg-studio` repository が clone 済み
- 正しい `.env`
- 必要なら Traefik や external network を持つ `docker-compose.override.yml`
- Docker と Docker Compose

repo に含まれる [`scripts/deploy.sh`](../../../scripts/deploy.sh) は、次を順に実行します。

1. `git fetch`
2. `git pull --ff-only`
3. `docker compose config`
4. `docker compose up -d --build`

schema 変更を明示的に流したい時は、
[`scripts/migrate-db.sh`](../../../scripts/migrate-db.sh) で API container 内の
`alembic upgrade head` も実行できます。

## 必要な secret

GitHub / Gitea のどちらでも、同じ secret 名を使う前提です。

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`
- `DEPLOY_KNOWN_HOSTS`

`DEPLOY_KNOWN_HOSTS` には `ssh-keyscan` で取った host key 行を入れます。

## workflow の流れ

repo に追加する workflow は次の順番です。

1. repository を checkout
2. `./scripts/pytest-safe.sh -q` を実行
3. SSH 鍵と known_hosts を配置
4. サーバーへ SSH
5. `./scripts/deploy.sh main` を実行

## 補足

- この方式なら、本番の `.env` や Traefik 設定を CI runner に持ち込まずに済みます
- runtime の環境値と reverse proxy 配線はサーバー側だけで管理できます
- サーバーに tracked なローカル変更があると `git pull --ff-only` は意図的に失敗し、drift が見える状態になります
