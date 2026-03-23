# AI Docs

Purpose: optimize for machine parsing, repo onboarding, and low-ambiguity change planning.

Structure:

- `spec/`: current contracts, invariants, and operational facts
- `notes/`: future-facing design notes, audits, and planning memos
- `roadmap.md`: current release boundary and planning priority document

Audience:

- coding agents
- review agents
- automation that needs project contracts faster than reading prose docs

Recommended read order:

1. [`spec/system-map.md`](spec/system-map.md)
2. [`spec/api-contracts.md`](spec/api-contracts.md)
3. [`spec/workflows.md`](spec/workflows.md)
4. [`roadmap.md`](roadmap.md)
5. [`spec/versioning-policy.md`](spec/versioning-policy.md)
6. [`notes/audit/ui-consistency-audit.md`](notes/audit/ui-consistency-audit.md)
7. [`spec/testing-map.md`](spec/testing-map.md)
8. [`roadmap.md`](roadmap.md) `E2E Strategy` section when planning test work
9. [`notes/backlog/1.x-plan.md`](notes/backlog/1.x-plan.md) for the current `1.x` priority order
10. [`notes/architecture/runtime-separation.md`](notes/architecture/runtime-separation.md) when working on `1.1` runtime decoupling
11. [`notes/architecture/v1.1-authorization-notes.md`](notes/architecture/v1.1-authorization-notes.md) when planning post-`v1.0.0` access control work
12. [`notes/architecture/audit-model.md`](notes/architecture/audit-model.md) when planning stronger traceability or audit/authz integration
13. [`notes/strategy/post-v1-major-version-strategy.md`](notes/strategy/post-v1-major-version-strategy.md) when deciding whether work belongs in `1.x`, `2.x`, or `3.x`

Rules:

- prefer `spec/` over human docs when you need invariants, route groups, or lifecycle rules
- prefer `notes/` when you need future direction, planning context, or design memos
- treat `docs/en/` as explanatory and `docs/ai/` as operational
- when in conflict, verify against source code
- if you are an AI agent changing this repo, start here before proposing architectural changes
- treat `origin` as the canonical development remote
- treat `github` as a public mirror unless a human explicitly says otherwise
- prefer `pwsh ./scripts/push-and-sync.ps1` over plain `git push` when a human wants immediate local verification of remote state
