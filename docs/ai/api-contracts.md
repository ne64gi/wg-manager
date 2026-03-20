# API Contracts

## Auth

Public:

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`

Protected with `Authorization: Bearer <access_token>`:

- all `/groups`, `/users`, `/peers`
- all `/config/*`
- all `/status/*`
- all `/gui/*`
- `GET /auth/me`
- `POST /auth/logout`

No role differentiation exists. Any authenticated login user is admin-equivalent.

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

Reissue route:

- `POST /peers/{peer_id}/reissue`

Reissue effects:

- rotate private/public/preshared keys
- reset reveal state
- invalidate cached/generated artifacts

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
- `GET /status/overview-history`
- `GET /status/peers`
- `GET /status/users-summary`
- `GET /status/groups-summary`
