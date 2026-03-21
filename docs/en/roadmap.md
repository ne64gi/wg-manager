# Roadmap

## Verified Beta State

The current beta has been verified with:

- local Docker-based test suite
- generated peer config and QR output
- generated server config
- live `config apply`
- successful WireGuard handshake on a VPS
- live peer removal followed by apply

## Next High-Value Work

- GUI
- richer dashboard and read-model APIs
- firewall / nftables plugin model
- richer initial settings and server settings management
- runtime status history beyond direct `wg show`
- localization for docs and GUI

## Scope Note

The project no longer plans to add multiple WireGuard interfaces such as `wg1` and `wg2`
inside a single stack as a roadmap target.

If multiple interfaces are needed later, the preferred direction is to run another
WireGuard container or another `wg-studio` stack instead of expanding one control plane
into multi-interface orchestration.

## Documentation Plan

- `docs/en`: active source documentation
- `docs/jp`: future Japanese translation after the GUI stabilizes
