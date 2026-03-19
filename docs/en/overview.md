# Overview

`wg-studio` manages desired state outside the WireGuard data plane.

It stores groups, users, peers, allocation policy, and initial endpoint settings in PostgreSQL, then generates and applies WireGuard configuration from that state.

Core goals:

- manage VPN segments through `Group -> User -> Peer`
- support group defaults plus per-user overrides
- generate server and client artifacts from DB state
- apply changes to a live WireGuard runtime
- expose runtime status for a future GUI

Current beta capabilities:

- PostgreSQL-backed domain state
- separate audit database
- group, user, and peer lifecycle operations
- peer config and QR generation
- server config generation
- Docker-based apply flow
- live peer traffic and handshake status

Non-goals for the current beta:

- GUI
- firewall enforcement plugins
- localized documentation
