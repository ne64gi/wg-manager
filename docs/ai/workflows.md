# Workflows

## Bootstrap

1. copy `.env.example` to `.env`
2. set JWT secret
3. optionally set bootstrap admin username/password
4. `docker compose up -d --build`
5. if no login users exist, complete first-admin setup in the GUI
6. login to `http://localhost:3900/wg-studio/`

## Normal Operator Flow

1. create group
2. create user in group
3. create peer for user
4. reveal once
5. apply config
6. monitor status and traffic

## Secret Download Flow

Single peer:

1. create or locate peer
2. reveal via `POST /config/peers/{peer_id}/reveal`
3. operator may download `.conf` and `.svg` from the reveal modal
4. second reveal is blocked until reissue

Group or user bundle:

1. request bundle warning
2. show explicit operator confirmation
3. bundle route reissues eligible peers
4. bundle route reveals regenerated peer artifacts
5. return zip with per-peer config and QR plus `NOTICE.txt`
6. apply updated server config before distributing new peer files

## State Transfer Flow

Export:

1. call `GET /state/export`
2. persist JSON as operator backup or migration artifact

Import:

1. operator selects exported JSON
2. UI warns that current state will be replaced
3. call `POST /state/import`
4. invalidate all GUI queries
5. apply config if runtime should match imported desired state immediately

## Toggle Semantics

If a group or user is inactive:

- related peers remain in DB
- related peers must not be emitted into live WireGuard server config

If a peer is inactive:

- peer remains in DB
- peer must not be emitted into live WireGuard server config

## GUI Mutation Expectations

After create/update/delete/toggle/reveal/reissue:

- invalidate relevant queries
- optionally call server apply when GUI setting says so
- use toast notifications, not inline persistent notices
- refresh sync-state on dashboard-relevant mutations

## Agent Notes

When changing backend behavior, verify at these layers:

1. service function
2. route translation to HTTP status/detail
3. frontend request adapter in `frontend/src/lib/api.ts`
4. page mutation handling

When changing secret behavior, inspect:

- `app/services/domain.py`
- `app/services/config_generation.py`
- `app/api/routes/config.py`
- `frontend/src/pages/PeersPage.tsx`
- `frontend/src/ui/RevealModal.tsx`
