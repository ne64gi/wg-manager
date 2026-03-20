# wg-studio

`wg-studio` is a WireGuard control plane built around `Group -> User -> Peer`.

Current beta status:

- PostgreSQL-backed source of truth
- FastAPI API
- Typer CLI for admin/dev use
- separate audit database
- policy-aware config generation
- WireGuard apply flow
- live WireGuard status API
- verified handshake on a real VPS

## Docs

English docs live under [`docs/en/`](docs/en/README.md).

Available pages:

- [`docs/en/README.md`](docs/en/README.md)
- [`docs/en/quick-start.md`](docs/en/quick-start.md)
- [`docs/en/overview.md`](docs/en/overview.md)
- [`docs/en/architecture.md`](docs/en/architecture.md)
- [`docs/en/domain-model.md`](docs/en/domain-model.md)
- [`docs/en/config-and-apply.md`](docs/en/config-and-apply.md)
- [`docs/en/api.md`](docs/en/api.md)
- [`docs/en/auth-and-api-rules.md`](docs/en/auth-and-api-rules.md)
- [`docs/en/development.md`](docs/en/development.md)
- [`docs/en/roadmap.md`](docs/en/roadmap.md)
- [`docs/ai/README.md`](docs/ai/README.md)

Japanese docs will later live under `docs/jp/`.

## Quick Start

Copy the checked-in env template and adjust local values:

```bash
cp .env.example .env
```

Minimum values to change before first login:

- `WG_SERVER_ENDPOINT`
- `WG_BOOTSTRAP_ADMIN_USERNAME`
- `WG_BOOTSTRAP_ADMIN_PASSWORD`
- `WG_JWT_SECRET_KEY`

Start the stack:

```bash
docker compose up -d --build
```

Open the GUI:

```text
http://localhost:3900/wg-studio/
```

Sign in with the bootstrap admin credentials from `.env`.

For a more complete GUI-first startup flow, see [`docs/en/quick-start.md`](docs/en/quick-start.md).

Check API health from inside the stack:

```bash
docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

Run a CLI command:

```bash
docker compose run --rm wg-studio-cli group list
```

## Security Notes

- The API is not published on a host port by default.
- The GUI is published through `nginx` on port `3900`.
- Generated artifacts live in the Docker named volume `wg_config`.
- Keep the real `.env` local-only and commit changes only to `.env.example`.

## License

MIT
