# Runtime Separation

Purpose: define the intended `1.1` boundary between the core application and the current Linux/Docker-backed WireGuard runtime.

Status: active `1.1.2` foundation note.

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
