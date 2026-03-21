# UI Consistency Audit

Purpose: repeatable checklist for finding copy, tone, and doc drift before release.

## Scope

Audit these surfaces together:

- `frontend/src/lib/i18n.ts`
- `frontend/src/pages/*`
- `frontend/src/ui/*`
- `README.md`
- `docs/en/*`
- `docs/ai/*`

Do not audit only one layer. Most drift appears between UI strings and docs.

## Primary Checks

### 1. Translation coverage

Find keys used in pages that do not exist in `i18n.ts`.

Look for:

- `t("...")` keys with no dictionary entry
- raw English fallback showing up in Japanese mode
- duplicated keys that imply the same concept

Typical commands:

```powershell
rg -n 't\("' frontend/src/pages frontend/src/ui
rg -n '"[^"]+":' frontend/src/lib/i18n.ts
```

### 2. Raw internal values leaking into UI

Check for enum or internal identifiers rendered directly.

Common offenders:

- scope values like `single_site`
- log levels like `warning`
- route or mode names copied from backend values

Search patterns:

```powershell
rg -n "group.scope|error_log_level|entry.level|scope_" frontend/src
```

### 3. Status vocabulary rules

Decide and enforce one rule per concept:

- toggle state: `On / Off`
- availability state: `Enabled / Disabled`
- runtime state: `Online / Offline`
- reveal state: `Revealed / Not revealed`

Reject mixed pairs like:

- `On` with `Enabled` for the same control
- `Consumed` with `Reveal`
- `Pending` with `Show`

### 4. Action verb consistency

Audit button and modal verbs.

Preferred split:

- open modal: `Add`
- submit new entity: `Create`
- submit edit: `Save changes`
- runtime sync action: `Apply config`
- secret action: `Reveal`
- key rotation: `Reissue`

Search patterns:

```powershell
rg -n "Add |Create |Save|Apply|Reveal|Reissue" frontend/src/pages
```

### 5. Confirmation sentence tone

Check all `window.confirm(...)` calls.

Rules:

- natural sentence
- include target name
- avoid mechanical prefix formats like `Delete user: "name"?`

Preferred shape:

- English: `Delete "name"?`
- Japanese: `「name」を削除しますか？`

### 6. Page-title tone

Within one locale, page titles should follow one style.

Avoid mixing:

- noun phrases
- action phrases
- architecture terms

Example target style:

- `System overview`
- `Group management`
- `User management`
- `Peer management`
- `Settings`

### 7. Docs current-state drift

Check for stale phrases that conflict with the current product state.

Common stale markers:

- `beta`
- `future GUI`
- `non-goals: GUI`
- missing setup/auth endpoints after implementation exists

Search patterns:

```powershell
rg -n "beta|future GUI|setup-status|change-password|bootstrap admin" README.md docs
```

### 8. Route index completeness

Compare docs route lists against route decorators.

Source of truth:

```powershell
rg -n '@router\.(get|post|patch|put|delete)\(' app/api/routes
```

Then verify:

- `docs/en/api.md`
- `docs/en/auth-and-api-rules.md`
- `docs/ai/api-contracts.md`

### 9. Human docs vs AI docs role split

Check that:

- `docs/en` explains product behavior
- `docs/ai` records invariants and operational rules
- `README.md` tells readers which one to open first

If the same concept appears in both, keep wording compatible even if density differs.

## Output Format For Agents

When reporting findings, group them by:

1. missing translations
2. vocabulary drift
3. stale docs
4. route/index mismatches

Each finding should include:

- file path
- concrete term or string
- why it is inconsistent

Prefer findings first. Propose fixes only after the inventory is complete.
