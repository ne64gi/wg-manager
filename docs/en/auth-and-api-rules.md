# Auth And API Rules

This page documents API behavior that is easy to miss if you only read the endpoint list.

## Authentication Model

`wg-studio` uses local login users, JWT access tokens, and DB-backed refresh sessions.

Main flow:

1. if startup created no login user, check `GET /auth/setup-status`
2. create the first login user with `POST /auth/setup`
3. sign in with `POST /auth/login`
4. receive `access_token` and `refresh_token`
5. call protected endpoints with `Authorization: Bearer <access_token>`
6. renew with `POST /auth/refresh`
7. revoke the session with `POST /auth/logout`

Relevant endpoints:

- `GET /auth/setup-status`
- `POST /auth/setup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `GET /gui/version`

## Protected Routes

Almost all control-plane routes require an authenticated login user.

Protected route groups:

- `/groups`
- `/users`
- `/peers`
- `/initial-settings`
- `/config/*`
- `/status/*`
- `/gui/*`
- `/auth/logout`
- `/auth/me`

Public route:

- `GET /health`
- `GET /auth/setup-status`
- `POST /auth/setup`

Current auth check behavior:

- missing bearer token -> `401` with `detail = "authentication required"`
- invalid or expired access token -> `401` with a string `detail`

There is no role model today. Any authenticated login user is treated as an administrator.

Bootstrap note:

- if `WG_BOOTSTRAP_ADMIN_USERNAME` and `WG_BOOTSTRAP_ADMIN_PASSWORD` are set, startup creates the first login user automatically
- if startup creates no login user, the GUI and API setup flow stay available until the first login user exists

Password update:

- authenticated users can rotate their own password through `POST /auth/change-password`
- the current password must be supplied

## One-Time Reveal Rules

Peer secrets are intentionally not exposed through stable read endpoints.

Canonical reveal endpoint:

- `POST /config/peers/{peer_id}/reveal`

Behavior:

- returns peer config text and QR SVG in one response
- marks the peer as revealed in the database
- sets `is_revealed = true`
- sets `revealed_at`
- rejects a second reveal for the same peer until keys are reissued
- cached artifact files must not bypass one-time reveal behavior

Disabled direct retrieval endpoints:

- `GET /config/peers/{peer_id}` -> `410`
- `GET /config/peers/{peer_id}/qr` -> `410`

The intended secret lifecycle is:

1. create peer
2. optionally generate/apply server config
3. reveal the peer artifacts once
4. if secrets must change, call `POST /peers/{peer_id}/reissue`
5. reveal again

## Reissue Rules

`POST /peers/{peer_id}/reissue` regenerates:

- peer private key
- peer public key
- preshared key

It also resets reveal state:

- `is_revealed = false`
- `revealed_at = null`
- peer artifacts are regenerated on the next reveal instead of reusing stale files

## Error Format

The API currently follows FastAPI default response shapes.

Domain and auth errors usually look like:

```json
{
  "detail": "group not found"
}
```

Validation errors use FastAPI's standard list format:

```json
{
  "detail": [
    {
      "loc": ["body", "network_cidr"],
      "msg": "Value error, 10.10.0.1/24 has host bits set",
      "type": "value_error"
    }
  ]
}
```

Practical client rule:

- if `detail` is a string, treat it as a displayable message
- if `detail` is a list, flatten the entries into readable validation text

## Status And Apply Expectations

GUI clients are expected to poll status endpoints.

Current GUI settings expose:

- `overview_refresh_seconds`
- `peers_refresh_seconds`
- `refresh_after_apply`

Recommended behavior:

- poll `/status/overview` and `/status/overview-history` on the overview interval
- poll `/status/peers` on the peer interval
- invalidate and refetch after create/update/delete/reveal/reissue/apply actions
- if `refresh_after_apply = true`, treat config mutations as "write then apply"
