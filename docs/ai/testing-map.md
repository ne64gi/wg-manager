# Testing Map

## Purpose

Give AI contributors a low-ambiguity map from change type to the minimum required automated checks.

## Current Test Layers

### Backend service and API tests

- runner: `docker compose run --rm --entrypoint pytest wg-studio-cli /app/tests -q`
- role: source-of-truth validation for domain logic, API contracts, reveal lifecycle, apply behavior, import/export, and auth rules

### Browser smoke tests

- runner: `docker compose run --rm wg-studio-e2e`
- framework: Playwright
- role: catch cross-layer regressions that unit or service tests miss
- scope: release smoke only for `v1.0.0`

## Smoke Scope For v1.0.0

Required browser paths:

- login or first-admin setup
- `Group -> User -> Peer` creation
- reveal modal opens and shows direct download actions
- apply button runs and dashboard sync-state remains visible
- logs page loads with filters and pagination controls

## Selector Strategy

When changing GUI code, prefer stable `data-testid` selectors for Playwright on:

- navigation items
- create flow buttons and modal submit buttons
- dashboard sync-state panel
- reveal modal actions
- logs filters and pagination

Do not add broad `data-testid` coverage everywhere by default.

## Environment Rules

- browser smoke targets an already-running stack
- `E2E_BASE_URL` defaults to `http://127.0.0.1:3900/wg-studio/`
- `E2E_USERNAME` and `E2E_PASSWORD` are the canonical credentials for existing stacks
- if setup mode is active, the smoke suite will create the first login user from those credentials
- for compose-network execution, prefer `http://wg-studio-web/wg-studio/` as the base URL

## Expansion Path After v1.0.0

Add E2E coverage in this order:

1. auth expiration and forced re-login
2. bundle zip verification
3. JSON export/import round-trip
4. mobile workflows
5. failure-path coverage for apply and reveal

## Minimum Pre-Release Test Pass

Before cutting or approving a release candidate:

- backend `pytest` passes
- frontend build passes
- Playwright smoke passes against a running stack
