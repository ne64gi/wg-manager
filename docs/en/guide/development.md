# Development

Purpose: describe the local development and verification workflow.

## Environment

Use `.env.example` as the template for your local `.env`.

Important defaults include:

- PostgreSQL connection URLs
- initial endpoint address and port
- WireGuard container/runtime wiring
- artifact root

Current runtime boundary note:

- `WG_RUNTIME_ADAPTER` exists so runtime selection has a single entry point
- `docker_container` is the only supported adapter in `1.1.5`
- the intent is early separation of runtime assumptions, not full cross-platform support yet

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
- browser E2E uses the isolated `docker-compose.e2e.yml` stack
- pytest uses the isolated `docker-compose.test.yml` stack

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

Wrapper entry points are also available as early launch-abstraction prep:

```bash
./scripts/stack.sh up
./scripts/stack.sh up runtime
./scripts/stack.sh build api
./scripts/stack.sh wait
./scripts/stack.sh health
./scripts/stack.sh smoke
./scripts/stack.sh cli group list
./scripts/stack.sh e2e
```

On PowerShell:

```powershell
pwsh ./scripts/stack.ps1 up
pwsh ./scripts/stack.ps1 up runtime
pwsh ./scripts/stack.ps1 build api
pwsh ./scripts/stack.ps1 wait
pwsh ./scripts/stack.ps1 health
pwsh ./scripts/stack.ps1 smoke
pwsh ./scripts/stack.ps1 cli group list
pwsh ./scripts/stack.ps1 e2e
```

Current logical targets for `up`, `build`, and `restart`:

- `core`
- `runtime`
- `api`
- `web`
- `db`

Additional wrapper commands:

- `wait`
  - poll the API health endpoint until the stack is ready enough for follow-up operator commands
- `health`
  - show compose service state, wait for API readiness, and verify both API health and web reachability from inside the stack
- `smoke`
  - boot an isolated compose stack first, then run the Playwright smoke suite there

Push and refresh the local remote-tracking ref in one step:

```powershell
pwsh ./scripts/push-and-sync.ps1
```

This helps avoid the common confusion where `git push` succeeds but `origin/main`
still looks stale locally until a later `git fetch`.

Run tests:

```bash
./scripts/pytest-safe.sh -q
```

`pytest-safe.sh` boots the isolated `docker-compose.test.yml` stack, creates dedicated test databases, and refuses to run against non-test database names.

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

Preferred wrapper-first smoke path:

```bash
./scripts/stack.sh smoke
```

Or directly through Docker Compose:

```bash
docker compose -f docker-compose.e2e.yml -p wg-studio-e2e up -d --build
docker compose -f docker-compose.e2e.yml -p wg-studio-e2e run --rm wg-studio-e2e npm run test:e2e
docker compose -f docker-compose.e2e.yml -p wg-studio-e2e down -v
```

Environment notes:

- the wrapper-based `smoke` command now boots an isolated stack and performs a bounded readiness wait before launching Playwright
- if no login users exist, the smoke suite uses the setup screen and creates the first admin user from `E2E_USERNAME` and `E2E_PASSWORD`
- if login users already exist, the suite expects those credentials to be valid
- browser E2E uses isolated PostgreSQL and artifact volumes, so it does not mutate the normal operator stack
- local `npm run test:e2e` remains available when Node and Playwright are installed on the host
