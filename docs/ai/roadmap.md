# Roadmap

Purpose: define the current release boundary and the shortest planning path after `v1.0.0`.

Status: mixed document.

- `v1.0.0` sections below describe the shipped boundary and should be treated as current release facts
- post-`v1.0.0` sections below are planning guidance and should be read together with `notes/`

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
- peer reveal download actions for config and QR
- bulk group or user peer bundle export with explicit warning
- JSON export and import for current control-plane state

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
- generic bulk operations beyond the defined peer bundle export flow

### Testing

- broad E2E test suite beyond release smoke coverage
- full coverage

## Acceptable Limitations

- polling instead of realtime updates
- basic error messages
- limited test coverage
- manual deployment flow
- only a minimal Playwright smoke path for release confidence, not full regression coverage

## Release Criteria

`v1.0.0` is releasable when all conditions are true:

- all Included items are implemented and working
- no critical bugs remain in peer creation, deletion, or apply
- apply state is visible and understandable
- dashboard drift state is visible and understandable
- peer reveal modal includes direct download actions
- bundle export and JSON state transfer work end to end
- authentication flow is stable: login, logout, expiration
- system recovers from restart without inconsistency
- the release smoke path is covered by a minimal browser E2E suite

## Post-`v1.0.0` Planning Pointers

Use the more specific planning documents when deciding what comes next:

- major-version direction: [`notes/strategy/post-v1-major-version-strategy.md`](notes/strategy/post-v1-major-version-strategy.md)
- current `1.x` order: [`notes/backlog/1.x-plan.md`](notes/backlog/1.x-plan.md)
- future authorization shape: [`notes/architecture/v1.1-authorization-notes.md`](notes/architecture/v1.1-authorization-notes.md)
- future audit shape: [`notes/architecture/audit-model.md`](notes/architecture/audit-model.md)

## Post 1.0 Ideas

- status history for graphs or Grafana
- graph interaction improvements such as click-to-expand drill-down views
- notification integration: Discord, LINE, others
- improved logging UI: filters, search
- advanced security hardening
- better mobile UX
- expand Playwright coverage from smoke paths into full regression coverage
- add archive, import/export, and mobile-specific E2E scenarios

## Current `1.x` Sequence

Use this order unless a human explicitly overrides it:

1. `1.1`: runtime separation
2. `1.2`: frontend modernization prep
3. `1.3`: UX and visibility improvements
4. `1.4`: authorization and audit hardening

This sequence is maintained in detail at [`notes/backlog/1.x-plan.md`](notes/backlog/1.x-plan.md).

## Cross-Cutting Quality Track

These should progress alongside `1.1` through `1.4`, not as separate version themes:

- Playwright expansion beyond smoke where it supports each phase
- ZIP bundle verification
- JSON export/import round-trip coverage
- mobile workflow coverage
- auth-expiration and apply-error failure-path coverage
- translation-gap cleanup
- vocabulary drift cleanup
- docs/UI wording alignment
- stale-doc detection and cleanup

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
- after `v1.0.0`, use [`spec/versioning-policy.md`](spec/versioning-policy.md) for `x.y.z` updates
- use `notes/` for future direction, not `spec/`
- prefer [`notes/README.md`](notes/README.md) when deciding where a new AI note belongs

When planning work, prefer closing Included gaps over polishing excluded areas.

## E2E Strategy

For `v1.0.0`:

- adopt Playwright only for a minimal release smoke suite
- target the highest-risk end-to-end paths:
  - login
  - group -> user -> peer creation
  - reveal modal opens and download actions are visible
  - apply flow updates dashboard sync-state
  - logs page loads with filters and pagination

After `v1.0.0`:

- treat Playwright as an expanding regression layer
- add bundle zip verification
- add JSON export/import round-trip coverage
- add mobile workflow coverage
- add failure-path coverage around auth expiration and apply errors
