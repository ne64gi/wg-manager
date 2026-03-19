# wg-studio

`wg-studio` is a WireGuard control plane built around `Group -> User -> Peer`.

`v1.0.0-beta` status:

- PostgreSQL-backed source of truth
- FastAPI API
- Typer CLI
- separate audit database
- group/user/peer lifecycle management
- policy-aware client config generation
- `wg0.conf` generation
- QR generation
- Docker-based apply flow
- live WireGuard status API
- verified WireGuard handshake on a real VPS

## Overview

`wg-studio` manages desired state outside the WireGuard data plane.

It stores groups, users, peers, allocation policy, and initial endpoint settings in PostgreSQL, then generates and applies WireGuard configuration from that state.

Current architecture:

- `app/api`: FastAPI entrypoint
- `app/cli`: Typer entrypoint
- `app/core`: runtime settings
- `app/db`: main and audit database wiring
- `app/models`: SQLAlchemy models
- `app/schemas`: Pydantic schemas
- `app/services`: domain, generation, apply, and audit logic

## Core Model

### Group

- organizational segment
- owns a parent network such as `/8`, `/16`, `/24`
- defines default `AllowedIPs`
- can define `dns_servers`
- owns allocation policy through `allocation_start_host` and `reserved_ips`

### User

- person or logical owner inside a group
- can inherit group access or override it
- owns multiple peers

### Peer

- one concrete device / connection endpoint
- gets an assigned VPN IP
- owns WireGuard key material
- tracks lifecycle and generation timestamps

## Scope Model

Group scope currently follows this rule:

- `admin`: `/8`
- `multi_site`: `/16`
- `single_site`: `/24`

## Access Resolution

Effective access resolves like this:

1. `User.allowed_ips_override` if present
2. otherwise `Group.default_allowed_ips`

Example:

- Group `upazawagroup`: `10.10.1.0/24`
- User `upa`: inherits `10.10.1.0/24`
- User `upah`: overrides to `10.10.1.254/32`

This effective result is used when generating peer client configuration.

## Allocation Policy

Automatic peer IP allocation is group-based.

- `allocation_start_host` is the search start position
- `reserved_ips` are permanently excluded
- network and broadcast addresses are always excluded
- manual `assigned_ip` uses the same validation rules
- allocation is integer-based and scales for `/8`, `/16`, and `/24`

Example:

- `network_cidr = 10.10.1.0/24`
- `allocation_start_host = 2`
- `reserved_ips = ["10.10.1.1"]`

Then auto allocation starts at `.2`, skips reserved and in-use IPs, and chooses the next usable host.

## Lifecycle

Peer lifecycle is tracked explicitly.

Fields:

- `created_at`
- `updated_at`
- `revoked_at`
- `last_config_generated_at`
- `is_active`

Operations:

- `peer create`
- `peer revoke`
- `peer delete`
- `user delete`
- `group delete`

Delete policy:

- `peer delete`: physical delete
- `user delete`: physical delete with peer cascade
- `group delete`: physical delete with user and peer cascade
- `peer revoke`: keep record, mark inactive, exclude from generated server config

## Databases

Two PostgreSQL databases are used in the default compose stack.

Main DB:

- default database: `wg_studio`
- stores groups, users, peers, server state, and initial settings

Audit DB:

- default database: `wg_studio_audit`
- stores operation logs separately from domain state

Logged operations currently include:

- `group.create`
- `group.update_allocation`
- `group.delete`
- `user.create`
- `user.delete`
- `peer.create`
- `peer.revoke`
- `peer.delete`
- `peer.generate_config`
- `server.generate_config`
- `server.apply_config`
- `initial_settings.update`

## Configuration Generation

Implemented artifacts:

- server config: `/wg/config/wg_confs/wg0.conf`
- peer config: `/wg/config/peers/<peer>.conf`
- peer QR: `/wg/config/peers/<peer>.svg`

In the default compose stack, these artifacts live in the shared Docker named volume
`wg_config`, not in a host bind-mounted `./config` directory.

Peer config behavior:

- `[Interface] DNS` is omitted when `Group.dns_servers` is `NULL`
- `[Interface] DNS` is emitted when group DNS exists
- `[Peer] PersistentKeepalive = 25` is always emitted
- endpoint address and port come from the `initial_settings` table

Server config behavior:

- only active peers are included
- each peer gets `AllowedIPs = <assigned_ip>/32`

Writes are atomic via temporary file + replace.

## Apply Flow

`wg-studio` applies generated server configuration through Docker.

Current flow:

1. generate fresh `wg0.conf`
2. if `wg0` does not exist, run `wg-quick up`
3. if `wg0` already exists, run `wg-quick strip ... | wg syncconf ...`

The current compose setup uses a thin WireGuard container intended to be controlled by `wg-studio`, not the LinuxServer WireGuard image.

## Initial Settings

The `initial_settings` singleton currently stores:

- endpoint address
- endpoint port

These values are used when generating peer configs.

CLI:

- `settings show`
- `settings set-endpoint --address <host> --port <port>`

API:

- `GET /initial-settings`
- `PUT /initial-settings`

## API

Available endpoints:

- `GET /health`
- `POST /groups`
- `PATCH /groups/{group_id}/allocation`
- `GET /groups`
- `GET /groups/{group_id}`
- `DELETE /groups/{group_id}`
- `POST /users`
- `GET /users`
- `GET /users/{user_id}`
- `DELETE /users/{user_id}`
- `POST /peers`
- `GET /peers`
- `GET /peers/{peer_id}`
- `POST /peers/{peer_id}/revoke`
- `DELETE /peers/{peer_id}`
- `GET /peers/{peer_id}/resolved-access`
- `POST /config/peers/{peer_id}/generate`
- `POST /config/server/generate`
- `POST /config/server/apply`
- `GET /initial-settings`
- `PUT /initial-settings`
- `GET /status/overview`
- `GET /status/peers`

## CLI

Available commands:

- `group create`
- `group update-allocation`
- `group list`
- `group delete`
- `user create`
- `user list`
- `user delete`
- `peer create`
- `peer list`
- `peer revoke`
- `peer delete`
- `peer resolved-access`
- `config generate-peer`
- `config generate-server`
- `config apply`
- `settings show`
- `settings set-endpoint`
- `init-db`

## Development

The project is intended to run entirely inside Docker.

Default development stack:

- `postgres` for main and audit databases
- `wg-studio-api`
- `wg-studio-cli`
- thin `wireguard` runtime container
- shared `wg_config` Docker volume for generated WireGuard artifacts
- internal Docker network for API / CLI / PostgreSQL

Runtime defaults are provided through `.env`.
Use `.env.example` as the checked-in template and keep the real `.env` local-only.

Notable defaults:

- initial endpoint address and port for newly bootstrapped `initial_settings`
- PostgreSQL connection URLs
- WireGuard container/runtime wiring

The API is not published on a host port by default.
Use the CLI, `docker compose exec`, or a future reverse proxy / GUI container inside the internal network.

Start the stack:

```bash
docker compose up -d --build
```

Run a CLI command:

```bash
docker compose run --rm wg-studio-cli group list
```

Check API health from inside the stack:

```bash
docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
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

Tests currently override the database URLs to temporary SQLite files for speed and isolation, while the normal compose stack uses PostgreSQL.

## Example Flow

Create a group with DNS:

```bash
docker compose run --rm wg-studio-cli group create \
  --name upazawagroup \
  --scope single_site \
  --network 10.10.1.0/24 \
  --allowed-ip 10.10.1.0/24 \
  --dns 1.1.1.1 \
  --dns 8.8.8.8
```

Set endpoint:

```bash
docker compose run --rm wg-studio-cli settings set-endpoint \
  --address 153.126.140.201 \
  --port 51820
```

Create user and peer:

```bash
docker compose run --rm wg-studio-cli user create \
  --group-id 1 \
  --name upa

docker compose run --rm wg-studio-cli peer create \
  --user-id 1 \
  --name Upa-PC \
  --assigned-ip 10.10.1.1
```

Generate and apply:

```bash
docker compose run --rm wg-studio-cli config generate-peer --peer-id 1
docker compose run --rm wg-studio-cli config generate-server
docker compose run --rm wg-studio-cli config apply
```

## Verified Beta State

The current beta has been verified with:

- local Docker-based test suite
- generated peer config and QR output
- generated server config
- live `config apply`
- successful WireGuard handshake on a VPS

## Known Next Steps

High-value follow-up work:

- firewall / nftables plugin model
- richer initial settings and server settings management
- runtime status collection beyond `wg show`
- GUI
- documentation split / localization

## License

MIT
