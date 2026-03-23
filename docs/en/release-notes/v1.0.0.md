# Release Notes: `v1.0.0`

`wg-studio v1.0.0` is the first stable release of the project as a WireGuard control plane built around `Group -> User -> Peer`.

## Highlights

- PostgreSQL-backed source of truth for groups, users, peers, login users, and settings
- FastAPI API with JWT-based login and refresh flow
- bundled React/Vite GUI served through `nginx` on port `3900`
- one-time peer reveal with QR output and direct download actions
- group and user peer bundle export with explicit warning and reissue-aware flow
- JSON export and import for current control-plane state
- dashboard apply-state visibility and runtime drift detection
- WireGuard runtime apply flow through generated `wg0.conf`
- GUI audit logs and peer runtime status visibility
- minimal Playwright smoke coverage for release confidence

## Operational Notes

- `v1.0.0` manages one WireGuard runtime per stack
- if you need another runtime such as `wg1` or a separate environment, run another container or another `wg-studio` stack
- pending peer artifact generation is informational, not drift by itself
- runtime drift is what drives `Apply required`

## Documentation

- operators should start with [`quick-start.md`](quick-start.md)
- architecture and behavior notes live under [`../current/overview.md`](../current/overview.md), [`../current/config-and-apply.md`](../current/config-and-apply.md), and [`../current/auth-and-api-rules.md`](../current/auth-and-api-rules.md)
- AI contributors should read [`../ai/README.md`](../ai/README.md) before planning changes

## Post-`v1.0.0` Direction

Planned follow-up work includes:

- graph and history improvements
- click-to-expand traffic and status graphs
- broader Playwright regression coverage
- authorization foundation work for `v1.1+`
