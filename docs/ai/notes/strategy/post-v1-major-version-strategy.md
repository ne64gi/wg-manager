# Post-`v1.0.0` Major Version Strategy

Purpose: capture the intended long-term growth order for `wg-studio` after `v1.0.0`.

Status: planning memo only. This is directional guidance for roadmap decisions, not a locked implementation contract.

## Core Principle

Grow the product in this order:

1. strengthen a single-runtime product
2. introduce stronger boundaries and larger-scale ownership
3. automate operations and integrate external systems

This keeps each stage usable on its own and avoids building future-scale features on top of weak single-instance foundations.

## Major Version Themes

### `1.x.x`

Theme: `Safe single-runtime operations`

Japanese summary:

- 小規模管理
- 現状の地盤強化
- 1台の WireGuard runtime を、複数人が安心して触れる状態へ近づける

Primary goal:

- finish the "safe and trustworthy single control plane" phase

Expected focus areas:

- authorization foundation
- stronger audit log coverage
- apply-before-change visibility such as diff support
- desired / runtime drift visibility
- stronger confirmation for dangerous operations
- status and history improvements
- settings management cleanup
- backup / restore
- GUI navigation and operator workflow cleanup
- runtime separability before runtime portability
- adapter boundaries around Linux-specific runtime control
- startup entry points that can later dispatch different runtime profiles without changing the core product
- frontend separability before framework migration
- Next-ready layout, routing, and data-loading boundaries

Interpretation:

- do not expand scope into multi-tenant orchestration yet
- first make one runtime safe, understandable, and resilient
- do not rush into Windows-native support
- instead, make Linux-specific runtime handling replaceable early
- the near-term target is separability, not portability
- do not rush into Next.js migration either
- instead, make the current React/Vite frontend structurally portable first

Current internal staging reference:

- use [`../backlog/1.x-plan.md`](../backlog/1.x-plan.md) as the canonical `1.x` order
- current sequence:
  - `1.1`: runtime separation
  - `1.2`: frontend modernization prep
  - `1.3`: UX / visibility improvements
  - `1.4`: authorization and audit hardening

Implementation intent for runtime separation:

- keep core CRUD, config generation, auth, GUI, audit, and drift logic platform-neutral
- isolate runtime-specific operations such as config write, apply, status read, and artifact-root handling
- prefer thin launch wrappers such as `start.sh` / `start.ps1` / `start.bat` over embedding environment assumptions into the core
- compose profiles and launch scripts may vary per host platform, but the product logic should not

Implementation intent for frontend separation:

- keep page composition separate from reusable UI components
- keep router-specific code out of shared UI where possible
- keep data fetching and query orchestration outside presentation components
- isolate browser-only APIs such as `window`, `document`, `localStorage`, and `matchMedia`
- move toward layout boundaries that could later map cleanly onto Next nested layouts
- optimize for "Next-ready" structure, not immediate Next migration

Exit condition for the `1.x` era:

- one WireGuard runtime can be operated safely and confidently by multiple humans

### `2.x.x`

Theme: `Scoped multi-runtime operations`

Japanese summary:

- 大規模管理
- マルチサーバー / マルチテナント対応
- 境界、所有権、責務の分離

Primary goal:

- move from "one safe runtime" to "many bounded runtimes and tenants"

Expected focus areas:

- multiple runtimes
- multiple organizations / tenants
- multiple environments
- multiple admin groups
- tenant-scoped policy
- tenant-scoped roles
- tenant- and runtime-aware audit boundaries

Interpretation:

- this phase is mostly about boundary design, ownership, and data model evolution
- this is not just "more servers"; it is about correct scope separation

Design warning for `1.x` contributors:

- avoid schema choices that make future tenant/runtime ownership impossible to add cleanly
- important future questions include:
  - which server/runtime owns a peer
  - which tenant/workspace owns a server
  - whether audit data is global or boundary-scoped
  - whether roles are global or tenant-scoped
  - whether policy is runtime-scoped or tenant-scoped

Possible internal staging:

- `2.0`: introduce server / tenant / workspace boundaries
- `2.1`: tenant-scoped roles and policy boundaries
- `2.2`: unified views across multiple runtimes and tenants

### `3.x.x`

Theme: `Autonomous and integrated operations`

Japanese summary:

- 自動運用
- 外部連携
- 統合と半自律化

Primary goal:

- reduce human operational load only after boundaries and control are mature

Expected focus areas:

- OIDC / SSO
- LDAP / AD
- webhook notifications
- Slack / Discord integration
- API tokens
- scheduled apply
- peer expiration
- auto-disable / auto-expire
- policy as code
- external CMDB or asset integration
- health automation and operational assistance

Interpretation:

- do not place multi-tenant as a `3.x` primary theme
- automation and integrations rely on clear boundaries, authorization, auditability, and rollback thinking

Possible internal staging:

- `3.0`: SSO, webhook, external notifications, stronger API integration surface
- `3.1`: auto-expiry, inventory checks, automated health checks
- `3.2`: external-system integration and semi-autonomous operations

## Why This Order Matters

This strategy is intentionally conservative.

Benefits:

- every stage leaves behind a usable product
- `1.x` is a real product, not just pre-work for `2.x`
- `2.x` expands scope without collapsing ownership boundaries
- `3.x` adds automation only after control and visibility already exist

Anti-pattern to avoid:

- designing for `3.x` dreams too early
- adding cross-boundary automation before single-runtime safety is complete
- expanding blast radius before operator confidence exists

## Short Canonical Summary

Use this wording when discussing post-`v1.0.0` direction:

- `1.x.x`: small-scale management, strengthen the current foundation
- `2.x.x`: large-scale management, multi-server and multi-tenant support
- `3.x.x`: automated operations and external integrations

Recommended polished wording:

- `1.x.x` 小規模管理（現状の地盤強化）
- `2.x.x` 大規模管理（マルチサーバー / マルチテナント化）
- `3.x.x` 自動運用・外部連携（統合と半自律化）

## Planning Rule

When a proposed feature appears after `v1.0.0`, first ask:

1. Is this strengthening single-runtime safety?
2. Is this introducing a new ownership boundary?
3. Is this reducing human work through automation or external linkage?

Map the work to `1.x`, `2.x`, or `3.x` accordingly before committing it to a roadmap.
