# English Docs

This folder holds the English project documentation for `wg-studio`.

Suggested reading order:

1. [`quick-start.md`](quick-start.md)
2. [`overview.md`](overview.md)
3. [`architecture.md`](architecture.md)
4. [`domain-model.md`](domain-model.md)
5. [`config-and-apply.md`](config-and-apply.md)
6. [`api.md`](api.md)
7. [`auth-and-api-rules.md`](auth-and-api-rules.md)
8. [`development.md`](development.md)
9. [`roadmap.md`](roadmap.md)

Current project state:

- release-readiness stage toward `v1.0.0`
- PostgreSQL-backed runtime
- internal-only API network by default
- bundled React/Vite GUI served through `nginx` on port `3900`
- shared Docker volume for WireGuard artifacts
- live status collection from the WireGuard runtime
