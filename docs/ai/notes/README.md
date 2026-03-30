# AI Notes

Use this folder for future-facing material:

- `strategy/`: long-term product direction and version-growth thinking
- `architecture/`: future implementation shapes and structural design notes
- `audit/`: review and cleanup inventories
- `backlog/`: near- to mid-term work ordering and theme-specific task notes

Recommended read order:

1. `strategy/` when deciding which era or version line work belongs to
2. `backlog/` when deciding what to do next inside the current era
3. `architecture/` when shaping how a future implementation should be structured
4. `audit/` when checking consistency, cleanup debt, or release polish

Current `1.1` starting point:

- read [`backlog/1.x-plan.md`](backlog/1.x-plan.md) for sequencing
- then read [`architecture/runtime-separation.md`](architecture/runtime-separation.md) for the current runtime-separation seam
- read [`architecture/v1.1-authorization-notes.md`](architecture/v1.1-authorization-notes.md) only as a future seam, not as the lead topic for `1.1.1`

Interpretation rules:

- `strategy/` answers "which phase is this work part of?"
- `backlog/` answers "what is the current priority order?"
- `architecture/` answers "how should this probably be built later?"
- `audit/` answers "what is currently inconsistent or drifting?"

Placement rule:

- if a document describes current behavior, it belongs in `docs/ai/spec/`
- if a document describes a likely future shape, it belongs in `docs/ai/notes/`
- if a document is mostly about sequencing, put it in `backlog/`
- if a document is mostly about design seams or abstractions, put it in `architecture/`

These files may discuss intended changes and do not automatically override current implementation.

Current `1.4` planning entry:

- read [`1.4.md`](1.4.md) for the concrete implementation boundary, dependency order, and merge checklist
- read [`../../jp/planning/policy.md`](../../jp/planning/policy.md) and [`../../jp/planning/middleware-design.md`](../../jp/planning/middleware-design.md) as temporary AI-facing design inputs until they are relocated
