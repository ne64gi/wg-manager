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

Hierarchy:

- `Group` is the top-level network and policy boundary
- `User` is a logical owner inside one group
- `Peer` is one concrete device inside one user
- there is no `Instance` model in `v1.0.0`

## Operational Invariants

- source of truth is PostgreSQL, not generated files
- generated peer artifacts live under shared `wg_config`
- server config generation excludes inactive groups, users, and peers
- peer secret reveal is one-time until reissue
- group and user bundle downloads reissue eligible peers before packaging secrets
- access tokens are JWT; refresh tokens are DB sessions
- GUI is the normal operator entry point
- the group network is the allocation boundary for descendant peers
- users do not own subnets; peers own concrete assigned addresses

## Route Ownership

- `app/api/routes/auth.py`: setup-status, setup, login, refresh, logout, me, change-password
- `app/api/routes/domain.py`: groups, users, peers, initial settings, state export/import
- `app/api/routes/config.py`: config generation, reveal, bundle download, apply
- `app/api/routes/status.py`: overview, sync-state, peers, summaries, history
- `app/api/routes/gui.py`: gui settings, login users, gui logs

## Frontend Ownership

- `pages/LoginPage.tsx`: unauthenticated entry
- `pages/DashboardPage.tsx`: overview and summaries
- `pages/DashboardPage.tsx`: overview, summaries, and sync-state visibility
- `pages/GroupsPage.tsx`: group CRUD and toggle
- `pages/UsersPage.tsx`: user CRUD, search/filter, toggle, bundle download
- `pages/PeersPage.tsx`: peer create/list/toggle/reveal/reissue/delete/apply
- `pages/SettingsPage.tsx`: GUI settings, initial settings, login users, state import/export
- `pages/LogsPage.tsx`: GUI log view

## Config Surface

From `.env`:

- DB URLs
- WireGuard endpoint/listen settings
- bootstrap admin username/password
- JWT secret and TTLs
- optional CORS origins
- optional bootstrap admin username/password for startup auto-bootstrap

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
