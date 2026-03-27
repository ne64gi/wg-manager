# Core / Design / WG Split Target

## Goal

The long-term extraction target is a three-part structure:

- `core`: reusable product-agnostic behavior
- `design`: reusable presentation and theme layer
- `wg`: WireGuard-specific domain and runtime logic

This is a target architecture note, not a claim that the current repository is already split this way.

## Core

Put responsibility here only if it remains useful without WireGuard.

Examples:

- login / logout
- session management
- auth token handling
- audit log foundation
- common API client foundation
- generic settings workflows
- reusable admin CRUD patterns when not tied to WG terminology

## Design

Put look-and-feel concerns here, without product-domain behavior.

Examples:

- design tokens
- theme handling
- layout shells
- shared components
- CSS organization
- page chrome and presentation primitives

## WG

Keep WireGuard-specific domain meaning and runtime control here.

Examples:

- group / user / peer model
- allowed IP rules
- config generation
- reveal and reissue flows
- runtime apply
- drift and sync status
- topology and WireGuard traffic views

## Naming Guidance

Use names that can move cleanly into one of these three areas later.

- avoid vague buckets such as `common`
- prefer `core` for product-agnostic behavior
- prefer `design` for visual and theming concerns
- prefer `wg` for WireGuard-specific logic

## Migration Heuristic

When touching a module, ask:

1. Does this make sense without WireGuard?
2. Is this mostly presentation?
3. Is this explicitly about WireGuard domain or runtime behavior?

If the answer is:

- yes to 1: it is a `core` candidate
- yes to 2: it is a `design` candidate
- yes to 3: it should stay in `wg`
