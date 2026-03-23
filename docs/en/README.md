# English Docs

This folder holds the English project documentation for `wg-studio`.

Folder layout:

- [`guide/`](guide/README.md): startup, development, and release reading
- [`current/`](current/README.md): current product behavior and reference
- [`planning/`](planning/README.md): roadmap and post-release direction

Suggested reading order:

1. [`guide/quick-start.md`](guide/quick-start.md)
2. [`current/overview.md`](current/overview.md)
3. [`current/architecture.md`](current/architecture.md)
4. [`current/domain-model.md`](current/domain-model.md)
5. [`current/config-and-apply.md`](current/config-and-apply.md)
6. [`current/api.md`](current/api.md)
7. [`current/auth-and-api-rules.md`](current/auth-and-api-rules.md)
8. [`release-notes/README.md`](release-notes/README.md)
9. [`guide/development.md`](guide/development.md)
10. [`planning/roadmap.md`](planning/roadmap.md)
11. [`../jp/README.md`](../jp/README.md) for Japanese operators

How to use these docs:

- use the files above to understand the current product and operator flow
- use [`planning/roadmap.md`](planning/roadmap.md) when you want the human-facing release boundary and growth order
- use [`../ai/README.md`](../ai/README.md) only when you specifically need the lower-ambiguity planning and contract view used by coding agents

Current project state:

- stable release documentation for `v1.0.0`
- PostgreSQL-backed runtime
- internal-only API network by default
- bundled React/Vite GUI served through `nginx` on port `3900`
- shared Docker volume for WireGuard artifacts
- live status collection from the WireGuard runtime
- dashboard drift and apply-state visibility
- bulk peer bundle export and JSON state transfer
