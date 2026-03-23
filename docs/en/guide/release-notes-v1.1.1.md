# Release Notes: `v1.1.1`

`wg-studio v1.1.1` is the first post-`v1.0.0` maintenance and foundation release.

This release focuses on early `1.1` groundwork rather than large visible feature expansion.

## Highlights

- introduced the first runtime service boundary under [`app/runtime/`](../../app/runtime/)
- separated artifact path and file-write concerns into `ArtifactStore`
- moved WireGuard runtime execution and dump parsing toward a dedicated runtime layer
- added early stack wrapper entry points:
  - [`scripts/stack.sh`](../../scripts/stack.sh)
  - [`scripts/stack.ps1`](../../scripts/stack.ps1)
- improved AI planning docs for `1.1` runtime separation
- fixed dashboard warning/info fallback copy so English UI no longer shows Japanese warnings
- aligned displayed build version handling around [`VERSION`](../../VERSION)

## Why This Release Matters

`v1.1.1` is intentionally small in operator-facing scope.

The main purpose is to start breaking Linux/Docker-specific runtime coupling before later `1.1` work:

- runtime portability can come later
- early separability had to come first

## Operator Notes

- runtime support is still `docker_container` only in `v1.1.1`
- this is not Windows runtime support yet
- the current stack command remains valid:

```bash
docker compose up -d --build
```

- optional wrapper entry points now exist for future launch cleanup:

```bash
./scripts/stack.sh up
pwsh ./scripts/stack.ps1 up
```

## Documentation

- development workflow: [`development.md`](development.md)
- current behavior and architecture: [`../current/overview.md`](../current/overview.md)
- `1.x` plan: [`../planning/roadmap.md`](../planning/roadmap.md)
- AI runtime-separation note: [`../../ai/notes/architecture/runtime-separation.md`](../../ai/notes/architecture/runtime-separation.md)
