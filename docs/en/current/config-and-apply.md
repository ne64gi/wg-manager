# Config And Apply

## Generated Artifacts

The current implementation generates:

- server config: `/wg/config/wg_confs/wg0.conf`
- peer config: `/wg/config/peers/<peer>.conf`
- peer QR: `/wg/config/peers/<peer>.svg`
- bulk bundle archive: generated in-memory and returned as zip download

In the default compose stack, these files live in the shared Docker named volume `wg_config`.

## Peer Config Rules

- `[Interface] DNS` is omitted when `Group.dns_servers` is empty
- `[Interface] DNS` is included when group DNS exists
- `[Peer] PersistentKeepalive = 25` is always emitted
- endpoint address and port come from the `initial_settings` singleton

Effective `AllowedIPs` come from the resolved access policy:

1. `User.allowed_ips_override`
2. else `Group.default_allowed_ips`

## Server Config Rules

- only active peers are included
- each peer gets `AllowedIPs = <assigned_ip>/32`

## Apply Flow

`wg-studio` applies server config through the thin WireGuard container.

Current flow:

1. generate fresh `wg0.conf`
2. if `wg0` does not exist, run `wg-quick up`
3. if `wg0` already exists, run `wg-quick strip ... | wg syncconf ...`

Writes are atomic through temporary file + replace before apply.

## Bulk Bundle Flow

Group and user bundle downloads are treated as secret rotation operations.

Current flow:

1. request bundle warning in the GUI
2. operator confirms the warning
3. eligible active peers are reissued
4. regenerated peer artifacts are revealed and packaged into a zip archive
5. operator applies updated server config before distributing the new peer files

Bundle contents:

- per-peer `.conf`
- per-peer `.svg`
- `NOTICE.txt`
