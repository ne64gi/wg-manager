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
- `wireguard`
- `wg-studio-web`

Profile-scoped helper services:

- `wg-studio-cli` (`tools`)
- `wg-studio-e2e` (`test`)

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
docker compose --profile tools run --rm wg-studio-cli group list
```

Push and refresh the local remote-tracking ref in one step:

```powershell
pwsh ./scripts/push-and-sync.ps1
```

This helps avoid the common confusion where `git push` succeeds but `origin/main`
still looks stale locally until a later `git fetch`.

Run tests:

```bash
docker compose --profile tools run --rm \
  -e DATABASE_URL=sqlite:////tmp/wg-studio-test.db \
  -e LOG_DATABASE_URL=sqlite:////tmp/wg-studio-log-test.db \
  -e ARTIFACT_ROOT=/tmp/generated \
  --entrypoint pytest \
  wg-studio-cli /app/tests -q
```

Tests currently override database URLs to temporary SQLite files for speed and isolation, while the normal runtime stack uses PostgreSQL.

## Browser E2E Direction

`v1.0.0` should adopt only a minimal Playwright smoke suite for release confidence.

Recommended smoke targets:

- login
- `Group -> User -> Peer` creation
- reveal modal visibility and download actions
- apply flow and dashboard sync-state visibility
- logs page loading with filters and pagination

After `v1.0.0`, expand Playwright incrementally instead of trying to build a full E2E matrix in one step.

## Browser E2E Commands

Install frontend test dependencies locally:

```bash
cd frontend
npm install
npx playwright install chromium
```

Run the release smoke suite through Docker Compose:

```bash
docker compose --profile test run --rm \
  -e E2E_BASE_URL=http://wg-studio-web/wg-studio/ \
  -e E2E_USERNAME=admin \
  -e E2E_PASSWORD=supersecret123 \
  wg-studio-e2e
```

Environment notes:

- if no login users exist, the smoke suite uses the setup screen and creates the first admin user from `E2E_USERNAME` and `E2E_PASSWORD`
- if login users already exist, the suite expects those credentials to be valid
- tests create uniquely named `Group`, `User`, and `Peer` records and do not currently clean them up automatically
- local `npm run test:e2e` remains available when Node and Playwright are installed on the host
