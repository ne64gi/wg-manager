from __future__ import annotations

import ipaddress
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Group, Peer, User
from app.schemas.domain import (
    GroupAllocationUpdate,
    GroupCreate,
    GroupUpdate,
    PeerCreate,
    PeerResolvedAccess,
    PeerUpdate,
    UserCreate,
    UserUpdate,
)
from app.services.audit import log_operation
from app.services.system import _b64key, generate_keypair


def ensure_peer_keys(session: Session, peer: Peer) -> Peer:
    if peer.private_key and peer.public_key and peer.preshared_key:
        return peer

    private_key, public_key = generate_keypair()
    peer.private_key = private_key
    peer.public_key = public_key
    peer.preshared_key = _b64key()
    peer.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(peer)
    return peer


def _host_capacity(network: ipaddress.IPv4Network | ipaddress.IPv6Network) -> int:
    return network.num_addresses - 2


def _usable_host_bounds(
    network: ipaddress.IPv4Network | ipaddress.IPv6Network,
) -> tuple[int, int]:
    first_usable = int(network.network_address) + 1
    last_usable = int(network.broadcast_address) - 1
    return first_usable, last_usable


def _validate_group_allocation_settings(
    network_cidr: str,
    allocation_start_host: int,
    reserved_ips: list[str],
) -> None:
    network = ipaddress.ip_network(network_cidr, strict=True)
    host_count = _host_capacity(network)
    if allocation_start_host > host_count:
        raise ValueError(
            f"allocation_start_host must be <= host count ({host_count})"
        )

    for ip in reserved_ips:
        if ipaddress.ip_address(ip) not in network:
            raise ValueError(f"reserved ip '{ip}' is outside group network")


def _group_name_taken(
    session: Session, name: str, exclude_group_id: int | None = None
) -> bool:
    query = select(Group).where(Group.name == name)
    if exclude_group_id is not None:
        query = query.where(Group.id != exclude_group_id)
    return session.scalar(query) is not None


def _peer_name_taken(
    session: Session,
    user_id: int,
    name: str,
    exclude_peer_id: int | None = None,
) -> bool:
    query = select(Peer).where(Peer.user_id == user_id, Peer.name == name)
    if exclude_peer_id is not None:
        query = query.where(Peer.id != exclude_peer_id)
    return session.scalar(query) is not None


def _user_name_taken(
    session: Session,
    group_id: int,
    name: str,
    exclude_user_id: int | None = None,
) -> bool:
    query = select(User).where(User.group_id == group_id, User.name == name)
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    return session.scalar(query) is not None


def _load_peer_with_context(session: Session, peer_id: int) -> Peer | None:
    return session.scalar(
        select(Peer)
        .options(joinedload(Peer.user).joinedload(User.group))
        .where(Peer.id == peer_id)
    )


def list_groups(session: Session) -> list[Group]:
    return list(session.scalars(select(Group).order_by(Group.name)))


def get_group(session: Session, group_id: int) -> Group | None:
    return session.get(Group, group_id)


def create_group(session: Session, payload: GroupCreate) -> Group:
    existing = session.scalar(select(Group).where(Group.name == payload.name))
    if existing:
        raise ValueError(f"group '{payload.name}' already exists")

    network_taken = session.scalar(
        select(Group).where(Group.network_cidr == payload.network_cidr)
    )
    if network_taken:
        raise ValueError(f"network '{payload.network_cidr}' is already assigned")

    _validate_group_allocation_settings(
        payload.network_cidr,
        payload.allocation_start_host,
        payload.reserved_ips,
    )

    group = Group(**payload.model_dump())
    session.add(group)
    session.commit()
    session.refresh(group)
    log_operation(
        "group.create",
        "group",
        group.id,
        source="service",
        details={
            "name": group.name,
            "scope": group.scope,
            "network_cidr": group.network_cidr,
            "dns_servers": group.dns_servers,
            "allocation_start_host": group.allocation_start_host,
            "reserved_ips": group.reserved_ips,
        },
    )
    return group


def update_group(session: Session, group_id: int, payload: GroupUpdate) -> Group:
    group = session.get(Group, group_id)
    if group is None:
        raise ValueError(f"group id={group_id} does not exist")

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != group.name:
        new_name = update_data["name"]
        if new_name is None:
            raise ValueError("group name cannot be null")
        if _group_name_taken(session, new_name, exclude_group_id=group_id):
            raise ValueError(f"group '{new_name}' already exists")
        group.name = new_name
    if "default_allowed_ips" in update_data:
        if update_data["default_allowed_ips"] is None:
            raise ValueError("default_allowed_ips cannot be null")
        group.default_allowed_ips = update_data["default_allowed_ips"]
    if "dns_servers" in update_data:
        group.dns_servers = update_data["dns_servers"]
    if "description" in update_data:
        group.description = update_data["description"] or ""
    if "is_active" in update_data:
        if update_data["is_active"] is None:
            raise ValueError("is_active cannot be null")
        group.is_active = update_data["is_active"]
    for user in group.users:
        for peer in user.peers:
            peer.last_config_generated_at = None
    session.commit()
    session.refresh(group)
    log_operation(
        "group.update",
        "group",
        group.id,
        source="service",
        details={
            "name": group.name,
            "default_allowed_ips": group.default_allowed_ips,
            "dns_servers": group.dns_servers,
            "description": group.description,
            "is_active": group.is_active,
        },
    )
    return group


def update_group_allocation(
    session: Session,
    group_id: int,
    payload: GroupAllocationUpdate,
) -> Group:
    group = session.get(Group, group_id)
    if group is None:
        raise ValueError(f"group id={group_id} does not exist")

    _validate_group_allocation_settings(
        group.network_cidr,
        payload.allocation_start_host,
        payload.reserved_ips,
    )

    group.allocation_start_host = payload.allocation_start_host
    group.reserved_ips = payload.reserved_ips
    session.commit()
    session.refresh(group)
    log_operation(
        "group.update_allocation",
        "group",
        group.id,
        source="service",
        details={
            "allocation_start_host": group.allocation_start_host,
            "reserved_ips": group.reserved_ips,
        },
    )
    return group


def list_users(session: Session, group_id: int | None = None) -> list[User]:
    query = select(User).order_by(User.name)
    if group_id is not None:
        query = query.where(User.group_id == group_id)
    return list(session.scalars(query))


def get_user(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)


def create_user(session: Session, payload: UserCreate) -> User:
    group = session.get(Group, payload.group_id)
    if group is None:
        raise ValueError(f"group id={payload.group_id} does not exist")
    if not group.is_active:
        raise ValueError(f"group id={payload.group_id} is inactive")

    existing = session.scalar(
        select(User).where(
            User.group_id == payload.group_id,
            User.name == payload.name,
        )
    )
    if existing:
        raise ValueError(
            f"user '{payload.name}' already exists in group id={payload.group_id}"
        )

    user = User(**payload.model_dump())
    session.add(user)
    session.commit()
    session.refresh(user)
    log_operation(
        "user.create",
        "user",
        user.id,
        source="service",
        details={
            "group_id": user.group_id,
            "name": user.name,
            "allowed_ips_override": user.allowed_ips_override,
        },
    )
    return user


def update_user(session: Session, user_id: int, payload: UserUpdate) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise ValueError(f"user id={user_id} does not exist")

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data:
        new_name = update_data["name"]
        if new_name is None:
            raise ValueError("user name cannot be null")
        if new_name != user.name and _user_name_taken(
            session, user.group_id, new_name, exclude_user_id=user_id
        ):
            raise ValueError(
                f"user '{new_name}' already exists in group id={user.group_id}"
            )
        user.name = new_name
    if "allowed_ips_override" in update_data:
        user.allowed_ips_override = update_data["allowed_ips_override"]
    if "description" in update_data:
        user.description = update_data["description"] or ""
    if "is_active" in update_data:
        if update_data["is_active"] is None:
            raise ValueError("is_active cannot be null")
        if update_data["is_active"] and not user.group.is_active:
            raise ValueError(f"group id={user.group_id} is inactive")
        user.is_active = update_data["is_active"]
    for peer in user.peers:
        peer.last_config_generated_at = None
    session.commit()
    session.refresh(user)
    log_operation(
        "user.update",
        "user",
        user.id,
        source="service",
        details={
            "group_id": user.group_id,
            "name": user.name,
            "allowed_ips_override": user.allowed_ips_override,
            "is_active": user.is_active,
        },
    )
    return user


def delete_user(session: Session, user_id: int) -> None:
    user = session.scalar(
        select(User)
        .options(joinedload(User.peers))
        .where(User.id == user_id)
    )
    if user is None:
        raise ValueError(f"user id={user_id} does not exist")

    peer_ids = [peer.id for peer in user.peers]
    details = {
        "group_id": user.group_id,
        "name": user.name,
        "deleted_peer_ids": peer_ids,
    }
    entity_id = user.id

    session.delete(user)
    session.commit()
    log_operation(
        "user.delete",
        "user",
        entity_id,
        source="service",
        details=details,
    )


def list_peers(session: Session, user_id: int | None = None) -> list[Peer]:
    query = select(Peer).order_by(Peer.name)
    if user_id is not None:
        query = query.where(Peer.user_id == user_id)
    return list(session.scalars(query))


def get_peer(session: Session, peer_id: int) -> Peer | None:
    return session.get(Peer, peer_id)


def revoke_peer(session: Session, peer_id: int) -> Peer:
    peer = session.get(Peer, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")

    now = datetime.now(timezone.utc)
    peer.is_active = False
    peer.revoked_at = now
    peer.updated_at = now
    session.commit()
    session.refresh(peer)
    log_operation(
        "peer.revoke",
        "peer",
        peer.id,
        source="service",
        details={
            "user_id": peer.user_id,
            "name": peer.name,
            "assigned_ip": peer.assigned_ip,
            "revoked_at": peer.revoked_at.isoformat() if peer.revoked_at else None,
        },
    )
    return peer


def delete_peer(session: Session, peer_id: int) -> None:
    peer = session.get(Peer, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")

    details = {
        "user_id": peer.user_id,
        "name": peer.name,
        "assigned_ip": peer.assigned_ip,
        "is_active": peer.is_active,
    }
    entity_id = peer.id
    session.delete(peer)
    session.commit()
    log_operation(
        "peer.delete",
        "peer",
        entity_id,
        source="service",
        details=details,
    )


def _reserved_ip_set(group: Group) -> set[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    return {ipaddress.ip_address(ip) for ip in (group.reserved_ips or [])}


def _ensure_assignable_ip(
    network: ipaddress.IPv4Network | ipaddress.IPv6Network,
    candidate: ipaddress.IPv4Address | ipaddress.IPv6Address,
    reserved_ips: set[ipaddress.IPv4Address | ipaddress.IPv6Address],
) -> None:
    first_usable, last_usable = _usable_host_bounds(network)
    candidate_int = int(candidate)

    if candidate not in network:
        raise ValueError(f"assigned ip '{candidate}' is outside group network '{network}'")
    if candidate_int < first_usable or candidate_int > last_usable:
        raise ValueError(f"assigned ip '{candidate}' is not a usable host in '{network}'")
    if candidate in reserved_ips:
        raise ValueError(f"assigned ip '{candidate}' is reserved in group '{network}'")


def _allocate_next_ip(session: Session, group: Group) -> str:
    network = ipaddress.ip_network(group.network_cidr, strict=True)
    first_usable, last_usable = _usable_host_bounds(network)
    candidate = first_usable + group.allocation_start_host - 1

    if candidate > last_usable:
        raise ValueError(f"no available IPs left in group network '{network}'")

    occupied = {
        int(ipaddress.ip_address(ip)) for ip in session.scalars(select(Peer.assigned_ip))
    }
    occupied.update(int(ipaddress.ip_address(ip)) for ip in (group.reserved_ips or []))

    relevant_occupied = sorted(
        ip for ip in occupied if candidate <= ip <= last_usable
    )

    for occupied_ip in relevant_occupied:
        if occupied_ip < candidate:
            continue
        if occupied_ip == candidate:
            candidate += 1
            continue
        break

    if candidate > last_usable:
        raise ValueError(f"no available IPs left in group network '{network}'")

    return str(ipaddress.ip_address(candidate))


def create_peer(session: Session, payload: PeerCreate) -> Peer:
    user = session.get(User, payload.user_id)
    if user is None:
        raise ValueError(f"user id={payload.user_id} does not exist")
    if not user.is_active:
        raise ValueError(f"user id={payload.user_id} is inactive")
    if not user.group.is_active:
        raise ValueError(f"group id={user.group_id} is inactive")

    if _peer_name_taken(session, payload.user_id, payload.name):
        raise ValueError(
            f"peer '{payload.name}' already exists for user id={payload.user_id}"
        )

    group_network = ipaddress.ip_network(user.group.network_cidr, strict=True)
    reserved_ips = _reserved_ip_set(user.group)
    assigned_ip = payload.assigned_ip
    if assigned_ip is None:
        assigned_ip = _allocate_next_ip(session, user.group)
    else:
        ip_taken = session.scalar(select(Peer).where(Peer.assigned_ip == assigned_ip))
        if ip_taken:
            raise ValueError(f"assigned ip '{assigned_ip}' is already in use")

        normalized_ip = ipaddress.ip_address(assigned_ip)
        _ensure_assignable_ip(group_network, normalized_ip, reserved_ips)
        assigned_ip = str(normalized_ip)

    peer = Peer(
        user_id=payload.user_id,
        name=payload.name,
        assigned_ip=assigned_ip,
        private_key=None,
        public_key=None,
        preshared_key=None,
        description=payload.description,
        is_active=payload.is_active,
    )
    session.add(peer)
    session.commit()
    session.refresh(peer)
    ensure_peer_keys(session, peer)
    log_operation(
        "peer.create",
        "peer",
        peer.id,
        source="service",
        details={
            "user_id": peer.user_id,
            "name": peer.name,
            "assigned_ip": peer.assigned_ip,
        },
    )
    return peer


def update_peer(session: Session, peer_id: int, payload: PeerUpdate) -> Peer:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data:
        new_name = update_data["name"]
        if new_name is None:
            raise ValueError("peer name cannot be null")
        if _peer_name_taken(session, peer.user_id, new_name, exclude_peer_id=peer_id):
            raise ValueError(
                f"peer '{new_name}' already exists for user id={peer.user_id}"
            )
        peer.name = new_name
    if "assigned_ip" in update_data:
        new_assigned_ip = update_data["assigned_ip"]
        if new_assigned_ip is None:
            raise ValueError("assigned_ip cannot be null")
        group_network = ipaddress.ip_network(peer.user.group.network_cidr, strict=True)
        reserved_ips = _reserved_ip_set(peer.user.group)
        ip_taken = session.scalar(
            select(Peer).where(Peer.assigned_ip == new_assigned_ip, Peer.id != peer_id)
        )
        if ip_taken:
            raise ValueError(f"assigned ip '{new_assigned_ip}' is already in use")

        normalized_ip = ipaddress.ip_address(new_assigned_ip)
        _ensure_assignable_ip(group_network, normalized_ip, reserved_ips)
        peer.assigned_ip = str(normalized_ip)
    if "description" in update_data:
        peer.description = update_data["description"] or ""
    if "is_active" in update_data:
        if update_data["is_active"] is None:
            raise ValueError("is_active cannot be null")
        if update_data["is_active"] and (not peer.user.is_active or not peer.user.group.is_active):
            raise ValueError(f"user id={peer.user_id} or group id={peer.user.group_id} is inactive")
        peer.is_active = update_data["is_active"]
        peer.revoked_at = None if update_data["is_active"] else datetime.now(timezone.utc)
    peer.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(peer)
    log_operation(
        "peer.update",
        "peer",
        peer.id,
        source="service",
        details={
            "user_id": peer.user_id,
            "name": peer.name,
            "assigned_ip": peer.assigned_ip,
            "is_active": peer.is_active,
        },
    )
    return peer


def reissue_peer_keys(session: Session, peer_id: int) -> Peer:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    if not peer.is_active:
        raise ValueError(f"peer id={peer_id} is inactive")
    if not peer.user.is_active:
        raise ValueError(f"user id={peer.user_id} is inactive")
    if not peer.user.group.is_active:
        raise ValueError(f"group id={peer.user.group_id} is inactive")

    private_key, public_key = generate_keypair()
    peer.private_key = private_key
    peer.public_key = public_key
    peer.preshared_key = _b64key()
    peer.is_revealed = False
    peer.revealed_at = None
    peer.last_config_generated_at = None
    peer.revoked_at = None
    peer.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(peer)
    log_operation(
        "peer.reissue_keys",
        "peer",
        peer.id,
        source="service",
        details={
            "user_id": peer.user_id,
            "name": peer.name,
            "assigned_ip": peer.assigned_ip,
        },
    )
    return peer


def delete_group(session: Session, group_id: int) -> None:
    group = session.scalar(
        select(Group)
        .options(joinedload(Group.users).joinedload(User.peers))
        .where(Group.id == group_id)
    )
    if group is None:
        raise ValueError(f"group id={group_id} does not exist")

    user_ids = [user.id for user in group.users]
    peer_ids = [peer.id for user in group.users for peer in user.peers]
    details = {
        "name": group.name,
        "deleted_user_ids": user_ids,
        "deleted_peer_ids": peer_ids,
    }
    entity_id = group.id

    session.delete(group)
    session.commit()
    log_operation(
        "group.delete",
        "group",
        entity_id,
        source="service",
        details=details,
    )


def resolve_peer_access(session: Session, peer_id: int) -> PeerResolvedAccess:
    peer = session.scalar(
        select(Peer)
        .options(joinedload(Peer.user).joinedload(User.group))
        .where(Peer.id == peer_id)
    )
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")

    user = peer.user
    group = user.group
    effective_allowed_ips = user.allowed_ips_override or group.default_allowed_ips

    return PeerResolvedAccess(
        peer_id=peer.id,
        peer_name=peer.name,
        assigned_ip=peer.assigned_ip,
        user_id=user.id,
        user_name=user.name,
        group_id=group.id,
        group_name=group.name,
        group_scope=group.scope,
        group_network_cidr=group.network_cidr,
        effective_allowed_ips=effective_allowed_ips,
    )
