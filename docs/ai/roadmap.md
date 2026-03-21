# Roadmap

## Version Target

- `v1.0.0`

## Goal

WireGuard peers can be safely created, managed, and applied through a web UI with consistent state and minimal operational friction.

## Included

These items must be complete for `v1.0.0`.

### Core

- peer management: create, delete, revoke
- `Group -> User -> Peer` structure
- config generation: `wg0.conf`, peer `.conf`
- apply operation via `syncconf`

### Security

- JWT-based authentication
- JWT secret managed through environment variables
- one-time reveal for peer config and QR

### UX

- basic dashboard: overview and peers
- polling-based status updates
- `401` handling: auto logout and redirect to login
- minimal API failure feedback

### State Consistency

- apply state visibility: applied vs not applied
- drift detection between DB state and runtime `wg` state

### Observability

- audit log: who did what
- peer status: online, traffic, handshake

## Explicitly Excluded

These are not part of `v1.0.0`.

### Infrastructure / Scale

- multi-instance orchestration inside one control plane
- introducing an `Instance` model above `Group`
- multi-server or multi-tenant support
- Kubernetes or Helm deployment

### Realtime

- WebSocket or push updates

### Security Advanced

- rate limiting
- encryption at rest
- fine-grained RBAC

### UX Advanced

- full i18n
- advanced filtering and search UX
- bulk operations

### Testing

- E2E test suite
- full coverage

## Acceptable Limitations

- polling instead of realtime updates
- basic error messages
- limited test coverage
- manual deployment flow

## Release Criteria

`v1.0.0` is releasable when all conditions are true:

- all Included items are implemented and working
- no critical bugs remain in peer creation, deletion, or apply
- apply state is visible and understandable
- authentication flow is stable: login, logout, expiration
- system recovers from restart without inconsistency

## Post 1.0 Ideas

- status history for graphs or Grafana
- notification integration: Discord, LINE, others
- improved logging UI: filters, search
- advanced security hardening
- better mobile UX

## Immediate Priorities

High-value near-term items that move the project toward `v1.0.0`:

- apply state visibility
- `401` handling hardening

## Agent Notes

Interpretation rules for automation and AI contributors:

- Included = required for `v1.0.0`
- Explicitly Excluded = do not expand scope into this for `v1.0.0`
- Acceptable Limitations = known rough edges that do not block release
- Release Criteria = finish line definition, not suggestion
- after `v1.0.0`, use [`versioning-policy.md`](versioning-policy.md) for `x.y.z` updates

When planning work, prefer closing Included gaps over polishing excluded areas.
