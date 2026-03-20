# System Map

## Stack

- backend: FastAPI in `app/api`
- services: business logic in `app/services`
- persistence: SQLAlchemy models in `app/models`
- frontend: React/Vite in `frontend/src`
- runtime proxy: `docker/frontend/nginx.conf`
- compose entry: `docker-compose.yml`

## Primary Data Model

- `Group`
- `User`
- `Peer`
- `InitialSettings` singleton
- `GuiSettings` singleton
- `LoginUser`
- `LoginSession`

Cardinality:

- `Group 1 -> many User`
- `User 1 -> many Peer`

## Operational Invariants

- source of truth is PostgreSQL, not generated files
- generated peer artifacts live under shared `wg_config`
- server config generation excludes inactive groups, users, and peers
- peer secret reveal is one-time until reissue
- access tokens are JWT; refresh tokens are DB sessions
- GUI is the normal operator entry point

## Route Ownership

- `app/api/routes/auth.py`: login, refresh, logout, me
- `app/api/routes/domain.py`: groups, users, peers, initial settings
- `app/api/routes/config.py`: config generation, reveal, apply
- `app/api/routes/status.py`: overview, peers, summaries, history
- `app/api/routes/gui.py`: gui settings, login users, gui logs

## Frontend Ownership

- `pages/LoginPage.tsx`: unauthenticated entry
- `pages/DashboardPage.tsx`: overview and summaries
- `pages/GroupsPage.tsx`: group CRUD and toggle
- `pages/UsersPage.tsx`: user CRUD, search/filter, toggle
- `pages/PeersPage.tsx`: peer create/list/toggle/reveal/reissue/delete/apply
- `pages/SettingsPage.tsx`: GUI settings, initial settings, login users
- `pages/LogsPage.tsx`: GUI log view

## Config Surface

From `.env`:

- DB URLs
- WireGuard endpoint/listen settings
- bootstrap admin username/password
- JWT secret and TTLs
- optional CORS origins

From `GuiSettings`:

- `theme_mode`
- `default_locale`
- `error_log_level`
- `access_log_path`
- `error_log_path`
- `overview_refresh_seconds`
- `peers_refresh_seconds`
- `refresh_after_apply`
- `online_threshold_seconds`
- `traffic_snapshot_interval_seconds`
