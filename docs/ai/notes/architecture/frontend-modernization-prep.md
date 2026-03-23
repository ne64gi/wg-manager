# Frontend Modernization Prep

Purpose: record the earliest frontend seams introduced for the `1.2.x` series so later Next-oriented work can build on something concrete.

Status: active architecture note.

Related docs:

- [`../../roadmap.md`](../../roadmap.md)
- [`../backlog/1.x-plan.md`](../backlog/1.x-plan.md)
- [`../../../en/planning/roadmap.md`](../../../en/planning/roadmap.md)

## `1.2.0` First Seam

The first `1.2.0` step does **not** migrate to Next.js.

It only starts reducing frontend coupling in places that would become painful later:

- route composition is no longer kept directly inside `App.tsx`
- preview theme and preview locale logic is no longer mixed into `i18n.ts`
- browser storage access starts moving behind small helpers
- document theme/lang synchronization becomes a dedicated hook instead of an inline `App.tsx` effect
- the authenticated shell now owns router-specific navigation wiring outside the reusable layout
- browser-only confirm/download/copy actions start moving into shared browser helpers
- dashboard data loading and apply-side effects now have a feature-level hook boundary
- settings-page query/mutation/form orchestration now has a GUI feature-level hook boundary

## Why This Matters

This keeps behavior stable while making the app easier to move later:

- routing can eventually move without also dragging document-side effects with it
- browser-only APIs are easier to identify and isolate
- `App.tsx` becomes closer to a top-level shell than a mixed routing/effect container
- page files start moving toward composition roles instead of owning every query and mutation directly

## Non-Goals For This Step

- no framework migration
- no major page rewrite
- no new server/client split
- no large design refresh
- no full interactive topology graph yet; that belongs to the later UX/visibility phase

## Next Useful Follow-Ups

- move route metadata and page registration into a more explicit app-level structure
- isolate navigation-specific UI from router-specific primitives where practical
- keep browser-only utilities grouped so SSR-sensitive code is visible early
- keep page-level DOM actions moving toward browser helpers instead of page-local implementations
- if a topology view appears during `1.2`, keep it as a lightweight structural preview rather than a feature-rich graph
- continue moving page-owned query/mutation orchestration into feature modules before touching larger visual work
