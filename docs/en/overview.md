# Overview

`wg-studio` manages WireGuard desired state outside the WireGuard data plane.

It stores groups, users, peers, allocation policy, login users, and endpoint settings in PostgreSQL, then generates and applies WireGuard configuration from that state.

Core goals:

- manage VPN segments through `Group -> User -> Peer`
- support group defaults plus per-user overrides
- generate server and client artifacts from DB state
- apply changes to a live WireGuard runtime
- expose runtime status through the bundled GUI and the API

Current product capabilities:

- PostgreSQL-backed domain state
- separate audit-oriented GUI log stream
- group, user, and peer lifecycle operations
- peer config and QR generation with one-time reveal semantics
- server config generation and apply flow
- Docker-based deployment path
- live peer traffic and handshake status
- bundled React/Vite GUI through `nginx`

Current non-goals:

- firewall enforcement plugins
- multi-server or multi-tenant orchestration inside one control plane
- WebSocket-based realtime updates
