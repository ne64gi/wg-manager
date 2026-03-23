# Architecture

The current package layout is:

- `app/api`: FastAPI entrypoint and HTTP routes
- `app/cli`: Typer entrypoint for admin/dev operations
- `app/core`: runtime settings
- `app/db`: SQLAlchemy engines and sessions
- `app/models`: domain and audit models
- `app/schemas`: API and service schemas
- `app/services`: domain logic, generation, apply, status, and audit

Runtime services in `docker-compose.yml`:

- `postgres`: main and audit databases
- `wg-studio-api`: FastAPI service on the internal Docker network
- `wireguard`: thin runtime container controlled by `wg-studio`
- `wg-studio-web`: bundled GUI served through `nginx`

Profile-scoped helper services:

- `wg-studio-cli`: admin/dev container on the internal Docker network (`tools`)
- `wg-studio-e2e`: Playwright smoke runner (`test`)

Security-oriented runtime choices:

- the API is not published on a host port by default
- generated artifacts live in the shared Docker volume `wg_config`
- the API and CLI talk over an internal Docker network
- the real `.env` file is intended to stay local-only

Status collection currently reads the live WireGuard runtime through Docker exec and `wg show ... dump`.
