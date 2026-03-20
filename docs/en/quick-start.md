# Quick Start

This is the shortest path to a running `wg-studio` stack with the GUI enabled.

## 1. Create `.env`

Use the checked-in template:

```bash
cp .env.example .env
```

Change at least these values:

- `WG_SERVER_ENDPOINT`
- `WG_BOOTSTRAP_ADMIN_USERNAME`
- `WG_BOOTSTRAP_ADMIN_PASSWORD`
- `WG_JWT_SECRET_KEY`

Recommended:

- keep `WG_CORS_ALLOWED_ORIGINS` empty when using the bundled GUI on `nginx`
- only set `WG_CORS_ALLOWED_ORIGINS` when serving another frontend origin

## 2. Start The Stack

```bash
docker compose up -d --build
```

Default services:

- `postgres`
- `wireguard`
- `wg-studio-api`
- `wg-studio-cli`
- `wg-studio-web`

## 3. Open The GUI

The bundled GUI is served by `nginx` on host port `3900`.

```text
http://localhost:3900/wg-studio/
```

Sign in with:

- `WG_BOOTSTRAP_ADMIN_USERNAME`
- `WG_BOOTSTRAP_ADMIN_PASSWORD`

## 4. Sanity Checks

Check API health from inside the stack:

```bash
docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
```

Run a CLI command:

```bash
docker compose run --rm wg-studio-cli group list
```

## 5. First GUI Workflow

Suggested first pass:

1. create a `Group`
2. create a `User` inside that group
3. create a `Peer`
4. use `Reveal` once to obtain the peer config
5. use `Apply config` to sync the server config into WireGuard

## Notes

- The API is internal-only by default in Compose.
- The GUI is the intended entry point for normal admin use.
- Generated peer configs and QR artifacts are stored in the shared Docker volume `wg_config`.
