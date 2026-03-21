# API Contracts

## Auth

Public:

- `GET /health`
- `GET /auth/setup-status`
- `POST /auth/setup`
- `POST /auth/login`
- `POST /auth/refresh`

Protected with `Authorization: Bearer <access_token>`:

- all `/groups`, `/users`, `/peers`
- all `/config/*`
- all `/status/*`
- all `/gui/*`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /gui/version`

No role differentiation exists. Any authenticated login user is admin-equivalent.

Version contract:

- `GET /gui/version`
- returns the active system version sourced from `VERSION`

## Secret Lifecycle

Canonical peer secret read:

- `POST /config/peers/{peer_id}/reveal`

Disabled legacy routes:

- `GET /config/peers/{peer_id}` -> `410`
- `GET /config/peers/{peer_id}/qr` -> `410`

Reveal effects:

- returns config text and QR SVG
- sets `peer.is_revealed = true`
- sets `peer.revealed_at`
- artifact caching must not bypass one-time reveal policy

Reissue route:

- `POST /peers/{peer_id}/reissue`

Reissue effects:

- rotate private/public/preshared keys
- reset reveal state
- invalidate cached/generated artifacts

Bulk bundle routes:

- `GET /config/groups/{group_id}/bundle-warning`
- `POST /config/groups/{group_id}/bundle`
- `GET /config/users/{user_id}/bundle-warning`
- `POST /config/users/{user_id}/bundle`

Bulk bundle effects:

- warning route exists for explicit operator confirmation
- bundle route reissues eligible active peers before packaging
- bundle route reveals the newly generated artifacts
- archive contains `.conf`, `.svg`, and `NOTICE.txt`
- treat bundle generation as a secret rotation event

## Error Shape

String-detail form:

```json
{"detail":"group not found"}
```

Validation-detail form:

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Value error, ...",
      "type": "value_error"
    }
  ]
}
```

Client guidance:

- `detail:string` => show directly
- `detail:list` => flatten `loc + msg`

## Status Polling

Frontend contract:

- overview polling interval from `gui_settings.overview_refresh_seconds`
- peer polling interval from `gui_settings.peers_refresh_seconds`
- post-mutation invalidate/refetch
- optionally auto-apply if `gui_settings.refresh_after_apply = true`

Current summary routes:

- `GET /status/overview`
- `GET /status/sync-state`
- `GET /status/overview-history`
- `GET /status/peers`
- `GET /status/users-summary`
- `GET /status/groups-summary`

Sync-state route contract:

- compares desired active peer state against runtime `wg` dump
- returns `synced`, `drifted`, or `runtime_unavailable`
- includes peer counts, pending generation count, timestamps, and drift reasons

## State Transfer

Routes:

- `GET /state/export`
- `POST /state/import`

Export contract:

- snapshot current server state, initial settings, GUI settings, and nested `Group -> User -> Peer` state

Import contract:

- replace current group/user/peer tree with provided payload
- preserve imported peer secret material and reveal metadata from payload
- treat as destructive administrative restore
