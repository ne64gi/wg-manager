# Development

## Environment

Use `.env.example` as the template for your local `.env`.

Important defaults include:

- PostgreSQL connection URLs
- initial endpoint address and port
- WireGuard container/runtime wiring
- artifact root

Keep the real `.env` local-only.

## Default Stack

The project is intended to run inside Docker.

Default services:

- `postgres`
- `wg-studio-api`
- `wg-studio-cli`
- `wireguard`

Notable runtime behavior:

- API and CLI live on an internal Docker network
- generated artifacts are stored in `wg_config`
- PostgreSQL state is stored in `postgres_data`

## Common Commands

Start the stack:

```bash
docker compose up -d --build
```

Check API health from inside the stack:

```bash
docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

Run a CLI command:

```bash
docker compose run --rm wg-studio-cli group list
```

Run tests:

```bash
docker compose run --rm \
  -e DATABASE_URL=sqlite:////tmp/wg-studio-test.db \
  -e LOG_DATABASE_URL=sqlite:////tmp/wg-studio-log-test.db \
  -e ARTIFACT_ROOT=/tmp/generated \
  --entrypoint pytest \
  wg-studio-cli /app/tests -q
```

Tests currently override database URLs to temporary SQLite files for speed and isolation, while the normal runtime stack uses PostgreSQL.
