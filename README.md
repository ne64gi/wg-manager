# wg-studio

`wg-studio` is a WireGuard control plane built around `Group -> User -> Peer`.

Current product state:

- PostgreSQL-backed source of truth
- FastAPI API
- Typer CLI for admin and development use
- bundled React/Vite GUI served through `nginx`
- policy-aware config generation
- one-time peer reveal with QR output
- peer reveal modal with direct config and QR download actions
- dashboard drift and apply-state visibility
- bulk group and user peer bundle export with warning-confirmed reissue
- current-state JSON export and import
- WireGuard apply flow
- live WireGuard status and GUI audit logs
- release-candidate documentation for `v1.0.0`

## Docs

English docs live under [`docs/en/`](docs/en/README.md).

Recommended starting points:

- [`docs/en/README.md`](docs/en/README.md)
- [`docs/en/quick-start.md`](docs/en/quick-start.md)
- [`docs/en/overview.md`](docs/en/overview.md)
- [`docs/en/api.md`](docs/en/api.md)
- [`docs/en/auth-and-api-rules.md`](docs/en/auth-and-api-rules.md)
- [`docs/en/release-notes-v1.0.0.md`](docs/en/release-notes-v1.0.0.md)
- [`docs/en/roadmap.md`](docs/en/roadmap.md)
- [`docs/ai/README.md`](docs/ai/README.md)
- [`docs/jp/README.md`](docs/jp/README.md)

Documentation roles:

- `docs/en`: human-facing product and operator documentation
- `docs/ai`: low-ambiguity operational notes for coding and review agents
- `docs/jp`: Japanese operator-facing documentation

AI contributors should start with [`docs/ai/README.md`](docs/ai/README.md) before planning or changing the system.

## Icon Sources

- navigation, settings, menu, and globe icons are repo-local inline SVG components defined in [`frontend/src/ui/Icons.tsx`](frontend/src/ui/Icons.tsx)
- the WireGuard brand mark used in the sidebar and login screen is bundled from Icon-Icons:
  - page: `https://icon-icons.com/icon/wireguard_logo/168760`
  - direct SVG used in-repo: `https://images.icon-icons.com/2699/SVG/wireguard_logo_icon_168760.svg`
  - local file: [`frontend/src/ui/wireguard-logo.svg`](frontend/src/ui/wireguard-logo.svg)
- no external icon package or CDN icon asset is required at runtime
- third-party asset notes live in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)

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

This starts only the normal runtime services:

- `postgres`
- `wireguard`
- `wg-studio-api`
- `wg-studio-web`

Tooling services are profile-scoped and do not start by default:

- `wg-studio-cli` -> `tools`
- `wg-studio-e2e` -> `test`

Open the GUI:

```text
http://localhost:3900/wg-studio/
```

First login behavior:

- if `WG_BOOTSTRAP_ADMIN_USERNAME` and `WG_BOOTSTRAP_ADMIN_PASSWORD` are set, startup creates the first login user automatically
- if no login users exist, the login screen switches into first-admin setup mode

For the complete GUI-first startup flow, see [`docs/en/quick-start.md`](docs/en/quick-start.md).

Multi-interface note:

- `wg-studio` `v1.0.0` manages one WireGuard runtime per stack
- if you want `wg1`, `wg2`, or another independent runtime, run another container or another `wg-studio` stack instead of extending one control plane into multi-instance orchestration

Check API health from inside the stack:

```bash
docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

Run a CLI command:

```bash
docker compose --profile tools run --rm wg-studio-cli group list
```

Login-user related CLI examples:

```bash
docker compose --profile tools run --rm wg-studio-cli setup-status
docker compose --profile tools run --rm wg-studio-cli setup --username admin --password supersecret123
docker compose --profile tools run --rm wg-studio-cli login-user list
docker compose --profile tools run --rm wg-studio-cli login-user set-password --login-user-id 1 --password newsecret123
```

## Security Notes

- The API is internal-only by default in Compose.
- The GUI is published through `nginx` on port `3900`.
- Generated artifacts live in the Docker named volume `wg_config`.
- Keep the real `.env` local-only and commit changes only to `.env.example`.

## License

- project code: [`MIT`](LICENSE)
- third-party asset attribution and reuse notes: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
