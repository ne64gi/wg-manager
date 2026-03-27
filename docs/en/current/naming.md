# Naming Rules

## Purpose

This document is the naming dictionary and naming-rule baseline for `wg-studio v1.2.2`.

- lock the dictionary first
- replace code after that
- do not drift halfway through the cleanup

The AI-facing source of truth is [docs/ai/spec/naming.md](/home/fuyumori/Docker/wg-studio/docs/ai/spec/naming.md). This file remains a human-facing reference.

## Core Rules

### 1. Prefer names that reveal responsibility

- prefer explicit responsibility over vague abstraction
- use the same suffix for the same kind of responsibility
- separate UI labels from internal identifiers when needed

### 2. Fix naming patterns by layer

- directory names: keep existing conventions, `snake_case` in backend and lowercase directories in frontend
- Python filenames: `snake_case`
- TypeScript filenames:
  - React components: `PascalCase.tsx`
  - hooks / utilities / modules: `camelCase.ts` or `camelCase.tsx`
- API paths: `kebab-case`
- query keys: align with API responsibility names

### 3. Do not mix common responsibility boundaries

- `gui` means GUI-specific settings and operations
- `domain` means persistent product domain entities
- `status` means current observed runtime state
- `state` means exportable and importable persisted state
- `config` means generated and applied configuration artifacts

### 4. Fix the suffix for page-level hooks

- hooks that assemble page-level data and actions use `use<PageName>PageData`
- hooks that return one query use `use<Subject>Query`
- hooks that mostly manage temporary UI state should still prefer `PageData` if they own a whole page

## Dictionary

| Canonical term | Use for | Avoid | Meaning |
| --- | --- | --- | --- |
| `gui` | GUI settings, login users, GUI logs | using `app` to mean GUI | the admin UI itself |
| `domain` | Group / User / Peer / InitialSettings | `data` | persistent product domain |
| `status` | observed state, sync state, traffic summaries | mixing with `state` | current runtime-facing state |
| `state` | export / import snapshots | mixing with `status` | persisted transferable state |
| `config` | generated or applied configuration | mixing with `settings` | runtime configuration artifacts |
| `settings` | editable values managed from UI | mixing with `config` | managed settings values |
| `overview` | top-level dashboard summary | using `summary` as a synonym | overview information |
| `summary` | per-group or per-user aggregate rows | mixing with `overview` | aggregate units |
| `page` | route-level UI responsibility | `screen` | routed view |
| `query` | one fetch concern | mixing with `data` | React Query fetch unit |
| `mutation` | one write concern | mixing with fetch-style `action` | React Query write unit |

## Naming Patterns

### Backend

- route handler: `<verb>_<subject>_endpoint`
- service function: `<verb>_<subject>`
- schema:
  - read model: `<Subject>Read`
  - create payload: `<Subject>Create`
  - update payload: `<Subject>Update`
- DB model: `<Subject>`

### Frontend

- page component: `<PageName>Page`
- page hook: `use<PageName>PageData`
- shared query hook: `use<Subject>Query`
- context: `<Subject>Context`
- provider component: `<Subject>Provider`
- browser helper: `<verb><Subject>`
- CSS class:
  - keep one prefix family per block, such as `login-*`, `sidebar-*`, or `toolbar-*`
  - use explicit modifier names, such as `login-card-wide` or `status-pill-online`
  - avoid vague suffixes like `-xui` or `-on`

## Initial Alignment Plan

### First targets

- unify page hook suffixes to `PageData`
- unify single-query hooks to `Query`
- preserve the responsibility boundary across `status`, `state`, `config`, and `settings`
- clean up CSS class prefixes and modifier names before splitting `styles.css`

### Initial candidates

| Current | Candidate | Why |
| --- | --- | --- |
| `useLoginPageState` | `useLoginPageData` | it owns page-level behavior, so `PageData` fits better than `State` |
| `useGuiLogsPage` | `useGuiLogsPageData` | keep the `gui` scope explicit while aligning to `PageData` |
| `useSettingsPageData` | keep | already matches the page-hook rule |
| `useGuiSettingsQuery` | keep | already matches the single-query rule |

## Notes For Replacement

- avoid changing API path names in `v1.2.2` unless there is a strong reason
- align internal code names first
- verify UI labels after code-level renames
- replace in bounded chunks instead of sweeping everything at once
