# Roadmap

Purpose: explain both the `v1.0.0` release boundary and the intended growth path after release.

## Current Release Boundary

### Version Target

- `v1.0.0`

### Goal

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

- broad E2E suite beyond release smoke coverage
- full coverage

## Acceptable Limitations

- polling instead of realtime updates
- basic error messages
- limited test coverage
- manual deployment flow
- only minimal browser smoke coverage at release time

## Release Criteria

`v1.0.0` is releasable when all conditions are true:

- all Included items are implemented and working
- no critical bugs remain in peer creation, deletion, or apply
- apply state is visible and understandable
- authentication flow is stable: login, logout, expiration
- system recovers from restart without inconsistency
- the highest-risk operator path is covered by a minimal browser smoke test

## Post-`v1.0.0` Direction

This project is intended to grow in layers, not by stacking advanced features onto a weak core.

### Current `1.x` order

The current intended sequence inside `1.x` is:

1. `1.1`: runtime separation
2. `1.2`: frontend modernization prep
3. `1.3`: UX and visibility improvements
4. `1.4`: authorization and audit hardening

Interpretation:

- separate internals before broadening behavior
- make the frontend structurally portable before any framework migration
- improve operator UX after the main seams are cleaner
- harden authorization after the runtime and frontend boundaries are less fragile
- allow `1.1` to introduce only the earliest authz seams, such as a no-op plugin, minimal action vocabulary, and audit-visible authz decisions
- keep real deny/allow policy behavior and broader authorization enforcement for the later hardening phase
- if topology-style network views are explored during `1.2`, keep them lightweight and structural only
- if configuration values gain layered overrides later, prefer one shared resolver seam before config generation rather than spreading precedence across routes or runtime code
- MTU is the current example:
  - `1.2.x` stores it only as an interface-level default
  - future expansion may add group, user, and peer overrides
  - precedence should stay outside runtime adapters

### Cross-cutting quality work

These should advance alongside `1.1` through `1.4`, rather than becoming their own version theme:

- broader Playwright coverage
- ZIP bundle verification
- JSON export/import round-trip coverage
- mobile workflow coverage
- auth-expiration and apply-error failure-path coverage
- translation cleanup
- vocabulary and wording cleanup
- docs/UI alignment

## Post 1.0 Ideas

- status history for graphs or Grafana
- graph interaction improvements such as click-to-expand views
- Cytoscape.js-based topology or relationship views for `Group -> User -> Peer`
- notification integration: Discord, LINE, others
- improved logging UI: filters, search
- advanced security hardening
- better mobile UX
- expand Playwright from smoke coverage into broader regression coverage
- practical use-case docs such as home VPN, team VPN, and small office VPN
- lightweight visual walkthroughs such as short GIFs or step-by-step screenshots

## Post-`v1.0.0` Version Direction

The intended growth order after `v1.0.0` is:

### `1.x.x`

Theme: `Safe single-runtime operations`

- strengthen single-runtime safety and operator trust
- focus on authorization foundations, audit coverage, diff visibility, safer apply, history, backup/restore, and UI flow cleanup
- separate Linux-specific runtime control behind adapter-style boundaries early, so future portability work does not require a large rewrite
- keep the frontend Next-ready by separating routing, data fetching, browser-only APIs, and reusable UI concerns before any framework migration
- keep future layered settings such as MTU override-ready by resolving effective values in service-level logic before config rendering
- target outcome: one WireGuard runtime can be operated safely by multiple humans

### `2.x.x`

Theme: `Scoped multi-runtime operations`

- expand into multi-server and multi-tenant management
- focus on boundaries, ownership, and data model evolution
- target outcome: multiple runtimes and tenants can be managed with clear separation

### `3.x.x`

Theme: `Autonomous and integrated operations`

- add automation and external integrations after the boundary model is mature
- focus on SSO, external notifications, API-driven integration, expiry automation, and semi-autonomous operations
- target outcome: lower human operational load through controlled automation

Short version:

- `1.x.x`: small-scale management, strengthen the current foundation
- `2.x.x`: large-scale management, multi-server and multi-tenant support
- `3.x.x`: automated operations and external integrations

For the low-ambiguity planning version used by agents, see [`../../ai/roadmap.md`](../../ai/roadmap.md).
