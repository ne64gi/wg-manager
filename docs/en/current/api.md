# API

This page is the endpoint index.

For operator backup flows, also read [`backup-and-restore.md`](backup-and-restore.md). Always take a full DB backup before destructive DB work.

For behavior rules that are not obvious from the route list, also read:

- [`../guide/quick-start.md`](../guide/quick-start.md)
- [`auth-and-api-rules.md`](auth-and-api-rules.md)

## Core Endpoints

- `GET /health`
- `POST /groups`
- `PATCH /groups/{group_id}`
- `PATCH /groups/{group_id}/allocation`
- `GET /groups`
- `GET /groups/{group_id}`
- `DELETE /groups/{group_id}`
- `POST /users`
- `PATCH /users/{user_id}`
- `GET /users`
- `GET /users/{user_id}`
- `DELETE /users/{user_id}`
- `POST /peers`
- `PATCH /peers/{peer_id}`
- `POST /peers/{peer_id}/reissue`
- `GET /peers`
- `GET /peers/{peer_id}`
- `POST /peers/{peer_id}/revoke`
- `DELETE /peers/{peer_id}`
- `GET /peers/{peer_id}/resolved-access`

## Config Endpoints

- `POST /config/peers/{peer_id}/generate`
- `POST /config/peers/{peer_id}/reveal`
- `GET /config/peers/{peer_id}` (`410`, intentionally disabled)
- `GET /config/peers/{peer_id}/qr` (`410`, intentionally disabled)
- `GET /config/groups/{group_id}/bundle-warning`
- `POST /config/groups/{group_id}/bundle`
- `GET /config/users/{user_id}/bundle-warning`
- `POST /config/users/{user_id}/bundle`
- `POST /config/server/generate`
- `POST /config/server/apply`

## Auth Endpoints

- `GET /auth/setup-status`
- `POST /auth/setup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

## Settings Endpoints

- `GET /initial-settings`
- `PUT /initial-settings`
- `GET /state/export`
- `POST /state/import`
- `GET /gui/settings`
- `GET /gui/version`
- `PUT /gui/settings`
- `GET /gui/login-users`
- `POST /gui/login-users`
- `GET /gui/login-users/{login_user_id}`
- `PATCH /gui/login-users/{login_user_id}`
- `DELETE /gui/login-users/{login_user_id}`
- `GET /gui/logs`

## Status Endpoints

- `GET /status/overview`
- `GET /status/sync-state`
- `GET /status/overview-history`
- `GET /status/peers`
- `GET /status/users-summary`
- `GET /status/groups-summary`

The status layer currently exposes:

- total received, sent, and combined traffic
- peer counts
- online/offline estimation from recent handshakes
- peer endpoint
- per-peer traffic counters
- resolved effective access
- drift and apply-state comparison between desired DB state and runtime WireGuard state

The API is internal-only by default in Compose.
