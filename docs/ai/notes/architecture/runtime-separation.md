# Runtime Separation

Purpose: define the intended `1.1` boundary between the core application and the current Linux/Docker-backed WireGuard runtime.

Status: active `1.1.5` foundation note.

Related docs:

- [`../backlog/1.x-plan.md`](../backlog/1.x-plan.md)
- [`../../spec/system-map.md`](../../spec/system-map.md)
- [`../../spec/workflows.md`](../../spec/workflows.md)

## Why This Exists

`wg-studio` currently works, but the operational path is still strongly shaped by the current runtime environment:

- Docker socket access
- container exec for `wg-quick` / `wg syncconf`
- Linux interface inspection
- artifact files rooted under the current runtime layout

The `1.1` goal is not full portability yet.

The immediate goal is **separability**:

- keep core CRUD and config logic from hard-coding runtime assumptions
- isolate Linux/Docker behavior behind a replaceable boundary
- reduce migration pain for later Windows, VM, or remote-runtime work

## Current Intended Boundary

### Core services should keep orchestration responsibilities

Examples:

- decide when config generation should happen
- decide when apply should happen
- decide how sync state should be interpreted
- decide when audit events should be recorded

### Runtime adapter should own runtime-facing mechanics

Examples:

- command execution inside the current WireGuard environment
- interface existence checks
- `wg show ... dump` retrieval
- `wg-quick up` / `wg syncconf` execution

### Artifact store should own artifact path and file-write mechanics

Examples:

- resolve server config path
- resolve peer config path
- resolve peer QR path
- perform atomic text/byte writes

## `1.1.1` Acceptance Shape

This first slice is considered good enough if all of these are true:

- `apply`, `status`, and config generation no longer talk directly to Docker transport details
- artifact path resolution is no longer spread across unrelated services
- runtime access is selected through a single adapter entry point
- the current Docker-based runtime remains the only production adapter
- no broad cross-platform abstraction is forced yet

## Explicit Non-Goals For `1.1.1`

- full Windows runtime support
- remote runtime support
- multi-runtime orchestration
- perfect interface design for every future backend
- large deployment redesign

## Working Mental Model

Use this separation when planning changes:

1. `app/services/*`
   - business orchestration
2. `app/runtime/wireguard.py`
   - current runtime adapter and runtime-facing helpers
3. `app/runtime/artifacts.py`
   - artifact storage mechanics
4. `scripts/stack.*`
   - operator-facing launch wrappers

## Follow-On Work

Natural next steps after the current foundation:

- move remaining runtime-facing mechanics behind the shared runtime service facade
- reduce remaining direct container/config assumptions in services
- add a cleaner public runtime service facade if the adapter surface grows
- prepare launch wrappers to become the preferred operator entry point

## `1.1.2` Progress Notes

This follow-up slice keeps the same `1.1` goal and does not widen into cross-platform support yet.

Changes introduced in the `1.1.2` line:

- `wg show ... dump` parsing moved into [`app/runtime/dump.py`](../../../app/runtime/dump.py)
- runtime peer reads now flow through [`app/runtime/service.py`](../../../app/runtime/service.py)
- artifact storage is expressed as a protocol with a local filesystem implementation
- the old `app/services/docker_runtime.py` compatibility layer is removed
- operator-facing launch wrappers remain early prep, not the only supported entry point yet

Visible improvement paired with this slice:

- dashboard group traffic now expands inline to show user traffic instead of forcing a second separate panel

Validation added in this slice:

- runtime/service-focused pytest coverage for dump parsing and runtime read failure handling
- Playwright smoke coverage for expanding group traffic into user traffic rows

## `1.1.3` Active Direction

The next `1.1` step should keep the same philosophy:

- do not jump to cross-platform portability yet
- keep moving runtime-facing mechanics behind a shared facade
- make operator entry points cleaner without forcing a full deployment redesign

Current `1.1.3` direction:

- introduce a runtime service facade that owns `describe`, `read_peers`, and `apply_config`
- stop having service modules reach straight into the adapter constructor path
- begin treating `scripts/stack.*` as wrapper entry points with logical targets such as `core`, `runtime`, `api`, `web`, and `db`
- keep visible operator improvements small and incremental while separation work continues

## `1.1.3` Progress Notes

Changes introduced in the `1.1.3` line:

- `apply` and `status` now flow through a shared runtime service facade instead of resolving the adapter directly
- runtime-facing reads degrade more gracefully when the runtime is temporarily unavailable
- `init_db()` now ensures GUI/auth tables are registered even when older local volumes are reused
- `scripts/stack.sh` and `scripts/stack.ps1` now support logical service targets for `up`, `build`, and `restart`

Visible improvements paired with this slice:

- dashboard desktop layout uses the right-side column more effectively
- desktop sidebar can collapse into icon-only navigation
- favicon support is now present for the web UI

Validation added in this slice:

- pytest coverage for runtime facade usage and runtime-unavailable status handling
- pytest coverage for `init_db()` registering GUI/auth tables on a clean database
- Playwright smoke coverage for desktop sidebar collapse

## `1.1.4` Active Direction

This slice should stay narrow:

- keep moving artifact/config mechanics behind the runtime facade
- make operator entrypoints more usable without redesigning deployment
- avoid introducing new adapters or broad cross-platform abstractions yet

Current `1.1.4` direction:

- stop letting config-generation paths reach directly into artifact-store setup
- let the runtime service own server-config and peer-artifact write entrypoints
- add small operator-facing stack helpers such as `health` and `smoke`

## `1.1.4` Progress Notes

Changes introduced in the `1.1.4` line:

- `app/services/config_generation.py` now writes server config, peer config, and peer QR output through `RuntimeService`
- `RuntimeService` now exposes a small artifact-facing public surface instead of only runtime reads/applies
- service entrypoints can now accept an injected runtime collaborator instead of resolving the global runtime factory every time
- `scripts/stack.sh` and `scripts/stack.ps1` now include `health` and `smoke` commands

Visible improvements paired with this slice:

- login-screen settings and credential controls were refined in parallel on the same release line

Validation added in this slice:

- pytest coverage for runtime-service artifact writes
- existing config-generation tests continue to verify peer/server artifact output

## `1.1.5` Active Direction

This slice continues the same `1.1` theme:

- make `scripts/stack.*` more credible as the preferred operator entrypoint
- harden smoke execution around bounded readiness checks instead of optimistic startup timing
- keep visible improvements small and operationally relevant

Current `1.1.5` direction:

- add a dedicated `wait` wrapper command for API readiness
- make `health` verify both API health and web reachability
- make `smoke` run from a known-good preflight state instead of assuming the stack is already ready
- expose the active runtime adapter in the settings UI as a small operator-facing confirmation

## `1.1.5` Progress Notes

Changes introduced in the `1.1.5` line:

- `scripts/stack.sh` and `scripts/stack.ps1` now expose `wait`
- `health` now performs bounded readiness polling before checking API and web reachability
- `smoke` now reuses the same readiness path before launching Playwright
- `/gui/version` now returns the active runtime adapter alongside the version fields

Visible improvements paired with this slice:

- settings now show the active runtime adapter in build information

Validation added in this slice:

- Playwright smoke now checks the runtime adapter field in settings
- smoke setup uses a more deterministic root wait before driving login/setup flows
