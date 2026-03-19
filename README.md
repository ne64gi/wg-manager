# wg-studio

WireGuard control plane prototype for managing `Group -> User -> Peer` with SQLite, API, CLI, and audit logging.

## Overview

`wg-studio` is a lightweight management layer around WireGuard.

It does not replace WireGuard itself.
Instead, it manages desired state outside the data plane and will eventually generate and apply WireGuard configuration from that state.

Current implementation focus:

- Group / User / Peer management
- Group-based routing defaults and User overrides
- Peer IP allocation policy
- SQLite-backed state
- FastAPI + Typer entrypoints
- Separate audit log database

Not implemented yet:

- `wg0.conf` generation
- client config generation
- `wg syncconf` apply flow
- status collection from `wg show`
- GUI

## Package Layout

Current application code is split like this:

- `app/api`: FastAPI entrypoint
- `app/cli`: Typer entrypoint
- `app/core`: settings and core configuration
- `app/db`: main DB and audit DB wiring
- `app/models`: SQLAlchemy models
- `app/schemas`: Pydantic schemas
- `app/services`: domain logic and audit logging

## Core Model

### Group

- Represents an organizational segment
- Owns a parent network such as `/8`, `/16`, `/24`
- Has default `AllowedIPs`
- Has allocation policy for automatic peer IP assignment

### User

- Represents a person or logical owner
- Belongs to a Group
- Can override `AllowedIPs`
- Owns multiple Peers

### Peer

- Represents one concrete device / connection endpoint
- Belongs to a User
- Has an assigned VPN IP
- Uses the effective access resolved from `User override -> Group default`

## Scope Model

Group scope currently follows this rule:

- `admin`: `/8`
- `multi_site`: `/16`
- `single_site`: `/24`

## Allocation Policy

Automatic peer IP allocation is group-based.

- `allocation_start_host` is the search start position
- `reserved_ips` are permanently excluded from automatic allocation
- network address and broadcast address are always excluded
- manual `assigned_ip` uses the same validation rules
- assignable addresses are usable hosts inside `group.network_cidr`

Example:

- `network_cidr = 10.10.1.0/24`
- `allocation_start_host = 2`
- `reserved_ips = ["10.10.1.1"]`

Then automatic assignment starts from `.2`, skips reserved or already-used IPs, and picks the next usable host.

## Access Resolution

Effective access is resolved like this:

1. If `User.allowed_ips_override` exists, use it
2. Otherwise use `Group.default_allowed_ips`

Example:

- Group `upazawagroup`: `10.10.1.0/24`
- User `upa`: inherits `10.10.1.0/24`
- User `upah`: override to `10.10.1.254/32`

## Databases

Two SQLite databases are used.

### Main DB

Default path:

`/data/wg-studio.db`

Stores Groups, Users, Peers, and allocation policy.

### Audit Log DB

Default path:

`/data/wg-studio-log.db`

Stores operation logs separately from domain state.

Current logged operations:

- `group.create`
- `group.update_allocation`
- `user.create`
- `peer.create`

This split is intentional so deletion-heavy workflows and future observability can rely on audit data without coupling it to the main state DB.

## Current API / CLI

### API

FastAPI is available through:

- `GET /health`
- `POST /groups`
- `PATCH /groups/{group_id}/allocation`
- `GET /groups`
- `GET /groups/{group_id}`
- `POST /users`
- `GET /users`
- `GET /users/{user_id}`
- `POST /peers`
- `GET /peers`
- `GET /peers/{peer_id}`
- `GET /peers/{peer_id}/resolved-access`

### CLI

Typer CLI is available through:

- `group create`
- `group update-allocation`
- `group list`
- `user create`
- `user list`
- `peer create`
- `peer list`
- `peer resolved-access`
- `init-db`

## Development

This project is intended to run inside Docker so the host environment stays clean.

### Start API

```bash
docker compose up wg-studio-api
```

### Run CLI

```bash
docker compose run --rm wg-studio-cli group list
```

### Run Tests

```bash
docker compose run --rm \
  -e DATABASE_URL=sqlite:////tmp/wg-studio-test.db \
  -e LOG_DATABASE_URL=sqlite:////tmp/wg-studio-log-test.db \
  --entrypoint pytest \
  wg-studio-cli /app/tests -q
```

## Example Flow

Create a group:

```bash
docker compose run --rm wg-studio-cli group create \
  --name upazawagroup \
  --scope single_site \
  --network 10.10.1.0/24 \
  --allowed-ip 10.10.1.0/24
```

Create a user:

```bash
docker compose run --rm wg-studio-cli user create \
  --group-id 1 \
  --name upa
```

Create a user with restricted access:

```bash
docker compose run --rm wg-studio-cli user create \
  --group-id 1 \
  --name upah \
  --allowed-ip 10.10.1.254/32
```

Create a peer with automatic IP allocation:

```bash
docker compose run --rm wg-studio-cli peer create \
  --user-id 2 \
  --name Upah-PC
```

Inspect resolved access:

```bash
docker compose run --rm wg-studio-cli peer resolved-access --peer-id 1
```

## Near-Term Roadmap

The next implementation steps are:

1. Peer lifecycle fields and deletion behavior
2. Config generation for `wg0.conf` and per-peer config
3. Safe apply flow
4. Runtime status collection and reconciliation

## Design Notes

- WireGuard itself remains the data plane
- `wg-studio` is the control plane
- The database is the source of truth
- Generated config files are artifacts, not primary state
- Audit logs are stored separately from domain state

## License

MIT
