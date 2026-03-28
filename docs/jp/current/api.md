# API 一覧

これはルート一覧です。挙動ルールは [`auth-and-api-rules.md`](auth-and-api-rules.md) も合わせて読んでください。

バックアップ運用は [`backup-and-restore.md`](backup-and-restore.md) を参照してください。DB を触る前は必ず full backup を取得します。

## 基本エンドポイント

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

## Config エンドポイント

- `POST /config/peers/{peer_id}/generate`
- `POST /config/peers/{peer_id}/reveal`
- `GET /config/peers/{peer_id}` (`410`, 無効化)
- `GET /config/peers/{peer_id}/qr` (`410`, 無効化)
- `GET /config/groups/{group_id}/bundle-warning`
- `POST /config/groups/{group_id}/bundle`
- `GET /config/users/{user_id}/bundle-warning`
- `POST /config/users/{user_id}/bundle`
- `POST /config/server/generate`
- `POST /config/server/apply`

## 認証エンドポイント

- `GET /auth/setup-status`
- `POST /auth/setup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

## 設定・状態転送エンドポイント

- `GET /initial-settings`
- `PUT /initial-settings`
- `GET /state/export`
- `POST /state/import`
- `GET /gui/settings`
- `PUT /gui/settings`
- `GET /gui/version`
- `GET /gui/login-users`
- `POST /gui/login-users`
- `GET /gui/login-users/{login_user_id}`
- `PATCH /gui/login-users/{login_user_id}`
- `DELETE /gui/login-users/{login_user_id}`
- `GET /gui/logs`

## ステータスエンドポイント

- `GET /status/overview`
- `GET /status/sync-state`
- `GET /status/overview-history`
- `GET /status/peers`
- `GET /status/users-summary`
- `GET /status/groups-summary`
