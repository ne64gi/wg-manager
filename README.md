# wg-studio

`wg-studio` is a WireGuard control plane built around `Group -> User -> Peer`.

Current product state:

- PostgreSQL-backed source of truth
- FastAPI API
- Typer CLI for admin and development use
- bundled React/Vite GUI served through `nginx`
- policy-aware config generation
- one-time peer reveal with QR output
- WireGuard apply flow
- live WireGuard status and GUI audit logs

## Docs

English docs live under [`docs/en/`](docs/en/README.md).

Recommended starting points:

- [`docs/en/README.md`](docs/en/README.md)
- [`docs/en/quick-start.md`](docs/en/quick-start.md)
- [`docs/en/overview.md`](docs/en/overview.md)
- [`docs/en/api.md`](docs/en/api.md)
- [`docs/en/auth-and-api-rules.md`](docs/en/auth-and-api-rules.md)
- [`docs/en/roadmap.md`](docs/en/roadmap.md)
- [`docs/ai/README.md`](docs/ai/README.md)

Documentation roles:

- `docs/en`: human-facing product and operator documentation
- `docs/ai`: low-ambiguity operational notes for coding and review agents

Japanese docs are not published yet in this branch.

## Quick Start

Copy the checked-in env template and adjust local values:

```bash
cp .env.example .env
```

Minimum values to change:

- `WG_SERVER_ENDPOINT`
- `WG_JWT_SECRET_KEY`

Optional but recommended for first login bootstrapping:

- `WG_BOOTSTRAP_ADMIN_USERNAME`
- `WG_BOOTSTRAP_ADMIN_PASSWORD`

Start the stack:

```bash
docker compose up -d --build
```

Open the GUI:

```text
http://localhost:3900/wg-studio/
```

First login behavior:

- if `WG_BOOTSTRAP_ADMIN_USERNAME` and `WG_BOOTSTRAP_ADMIN_PASSWORD` are set, startup creates the first login user automatically
- if no login users exist, the login screen switches into first-admin setup mode

For the complete GUI-first startup flow, see [`docs/en/quick-start.md`](docs/en/quick-start.md).

Check API health from inside the stack:

```bash
docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

Run a CLI command:

```bash
docker compose run --rm wg-studio-cli group list
```

Login-user related CLI examples:

```bash
docker compose run --rm wg-studio-cli setup-status
docker compose run --rm wg-studio-cli setup --username admin --password supersecret123
docker compose run --rm wg-studio-cli login-user list
docker compose run --rm wg-studio-cli login-user set-password --login-user-id 1 --password newsecret123
```

## Security Notes

- The API is internal-only by default in Compose.
- The GUI is published through `nginx` on port `3900`.
- Generated artifacts live in the Docker named volume `wg_config`.
- Keep the real `.env` local-only and commit changes only to `.env.example`.

## License

MIT
