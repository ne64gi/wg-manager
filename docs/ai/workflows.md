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
