# AI Docs

Purpose: optimize for machine parsing, repo onboarding, and low-ambiguity change planning.

Audience:

- coding agents
- review agents
- automation that needs project contracts faster than reading prose docs

Recommended read order:

1. [`system-map.md`](system-map.md)
2. [`api-contracts.md`](api-contracts.md)
3. [`workflows.md`](workflows.md)
4. [`roadmap.md`](roadmap.md)
5. [`versioning-policy.md`](versioning-policy.md)
6. [`ui-consistency-audit.md`](ui-consistency-audit.md)
7. [`testing-map.md`](testing-map.md)
8. [`roadmap.md`](roadmap.md) `E2E Strategy` section when planning test work
9. [`v1.1-authorization-notes.md`](v1.1-authorization-notes.md) when planning post-`v1.0.0` access control work
10. [`post-v1-major-version-strategy.md`](post-v1-major-version-strategy.md) when deciding whether work belongs in `1.x`, `2.x`, or `3.x`

Rules:

- prefer this folder over human docs when you need invariants, route groups, or lifecycle rules
- treat `docs/en/` as explanatory and `docs/ai/` as operational
- when in conflict, verify against source code
- if you are an AI agent changing this repo, start here before proposing architectural changes
- treat `origin` as the canonical development remote
- treat `github` as a public mirror unless a human explicitly says otherwise
- prefer `pwsh ./scripts/push-and-sync.ps1` over plain `git push` when a human wants immediate local verification of remote state
