# Domain Model

## Group

A group is the top-level segment container.

Responsibilities:

- own a network such as `/8`, `/16`, or `/24`
- define default `AllowedIPs`
- define optional `dns_servers`
- control automatic IP allocation through `allocation_start_host`
- permanently exclude specific addresses through `reserved_ips`

Scope convention currently used:

- `admin`: `/8`
- `multi_site`: `/16`
- `single_site`: `/24`

IP design notes:

- the group network is the allocation boundary for all descendant peers
- scope decides the required group prefix length
- peer addresses must belong to the parent group network
- host bits in submitted CIDR values are normalized before persistence
- `Group` is the highest IP-planning unit in `v1.0.0`; there is no extra `Instance` layer

## User

A user belongs to a group and can either inherit group access or override it.

Responsibilities:

- represent a person or logical owner
- optionally define `allowed_ips_override`
- own multiple peers

Access resolution order:

1. `User.allowed_ips_override` if present
2. otherwise `Group.default_allowed_ips`

## Peer

A peer is one concrete device or connection endpoint.

Responsibilities:

- hold an assigned VPN IP
- own WireGuard key material
- participate in config generation
- expose lifecycle and status data

Lifecycle fields:

- `created_at`
- `updated_at`
- `revoked_at`
- `last_config_generated_at`
- `is_active`

Lifecycle operations:

- create
- revoke
- delete

Delete policy:

- `peer delete`: physical delete
- `user delete`: physical delete with peer cascade
- `group delete`: physical delete with user and peer cascade

## Allocation Policy

Automatic peer allocation is group-based.

Rules:

- `allocation_start_host` is the search start position
- `reserved_ips` are permanently excluded
- network and broadcast addresses are never allocated
- manual `assigned_ip` uses the same validation rules
- allocation is integer-based and scales for `/8`, `/16`, and `/24`
- users do not own subnets; they only inherit or override routes
- peers own one concrete assigned VPN address inside the parent group network
