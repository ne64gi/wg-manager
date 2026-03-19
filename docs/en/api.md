# API

## Core Endpoints

- `GET /health`
- `POST /groups`
- `PATCH /groups/{group_id}/allocation`
- `GET /groups`
- `GET /groups/{group_id}`
- `DELETE /groups/{group_id}`
- `POST /users`
- `GET /users`
- `GET /users/{user_id}`
- `DELETE /users/{user_id}`
- `POST /peers`
- `GET /peers`
- `GET /peers/{peer_id}`
- `POST /peers/{peer_id}/revoke`
- `DELETE /peers/{peer_id}`
- `GET /peers/{peer_id}/resolved-access`

## Config Endpoints

- `POST /config/peers/{peer_id}/generate`
- `GET /config/peers/{peer_id}`
- `GET /config/peers/{peer_id}/qr`
- `POST /config/server/generate`
- `POST /config/server/apply`

## Settings Endpoints

- `GET /initial-settings`
- `PUT /initial-settings`

## Status Endpoints

- `GET /status/overview`
- `GET /status/peers`

The status layer currently exposes:

- total received, sent, and combined traffic
- peer counts
- online/offline estimation from recent handshakes
- peer endpoint
- per-peer traffic counters
- resolved effective access

The config endpoints are intentionally internal-facing in the default compose setup.
