# Naming Spec

## Purpose

This file is the AI-facing naming source of truth for `wg-studio v1.2.2`.

Use it before proposing or applying renames.

## Goals

- reduce ambiguity during code reading and code generation
- keep one canonical term for one responsibility
- make rename decisions deterministic
- avoid creating new aliases for an existing concept

## Decision Rules

### Responsibility first

- choose the name that makes ownership and behavior clearest
- avoid generic labels like `data`, `common`, or `manager` unless they are truly precise

### One suffix per responsibility

- page-level React hook: `use<PageName>PageData`
- single-query hook: `use<Subject>Query`
- page component: `<PageName>Page`
- context object: `<Subject>Context`
- provider component: `<Subject>Provider`
- route handler: `<verb>_<subject>_endpoint`
- service function: `<verb>_<subject>`

### CSS class rules

- keep one primary prefix family per visual block, such as `login-*`, `sidebar-*`, `toolbar-*`, or `topology-*`
- element classes should stay inside the same family, such as `login-settings-button` or `sidebar-user-popover`
- prefer explicit modifier names over vague suffixes
- acceptable modifier style in the current codebase is `block-modifier`, for example `login-card-wide` or `status-pill-online`
- avoid opaque names like `-xui`, `-item2`, or generic state names like `-on` when the state meaning can be spelled out
- utility classes should remain generic only when reused across multiple blocks, such as `muted-text` or `page-stack`

### Preserve boundary terms

- `gui`: GUI-specific settings and GUI-only operations
- `domain`: persistent product entities and their editable records
- `status`: current observed runtime state
- `state`: exportable and importable persisted state
- `config`: generated or applied configuration artifacts
- `settings`: editable configuration values managed through UI or setup flows
- `overview`: top-level dashboard view or summary
- `summary`: aggregate rows grouped by a concrete subject

### Naming precedence

When two valid names exist, prefer the one that is:

1. more explicit about scope
2. aligned with an existing stable pattern
3. less likely to collide with another domain later

## Canonical Mapping

| Concept | Canonical name | Avoid |
| --- | --- | --- |
| login page hook | `useLoginPageData` | `useLoginPageState` |
| GUI logs page hook | `useGuiLogsPageData` | `useGuiLogsPage` |
| GUI settings query hook | `useGuiSettingsQuery` | `useGuiSettingsData` |
| settings page hook | `useSettingsPageData` | `useSettingsPageState` |
| current runtime drift / health snapshot | `status` | `state` |
| export / import payloads | `state` | `status` |
| generated server artifacts | `config` | `settings` |
| login card wide modifier | `login-card-wide` | `login-card-xui` |
| active toggle chip modifier | `toggle-chip-active` | `toggle-chip-on` |
| online status pill modifier | `status-pill-online` | `status-online` |

## Replacement Policy

- rename internal code identifiers before changing API paths
- do not change stable API paths in `v1.2.2` unless the gain is substantial
- rename in bounded slices with import updates in the same change
- after each slice, search for old identifiers and remove leftovers

## Initial v1.2.2 Slice

The first naming cleanup slice is:

- page hook suffix unification to `PageData`
- obvious CSS modifier cleanup before CSS file splitting
- no API contract rename
- no schema rename
- no query-key rename unless required by a code-level rename
