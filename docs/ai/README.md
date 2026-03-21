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

Rules:

- prefer this folder over human docs when you need invariants, route groups, or lifecycle rules
- treat `docs/en/` as explanatory and `docs/ai/` as operational
- when in conflict, verify against source code
- if you are an AI agent changing this repo, start here before proposing architectural changes
