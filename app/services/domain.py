from __future__ import annotations

import ipaddress
from datetime import datetime, timezone

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session, joinedload

from app.db import Base, engine
from app.models import Group, Peer, User
from app.schemas import (
    GroupAllocationUpdate,
    GroupCreate,
    PeerCreate,
    PeerResolvedAccess,
    UserCreate,
)
from app.services.audit import init_log_db, log_operation


def _migrate_groups_table() -> None:
    inspector = inspect(engine)
    if "groups" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("groups")}
    with engine.begin() as connection:
        if "allocation_start_host" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE groups ADD COLUMN allocation_start_host INTEGER NOT NULL DEFAULT 1"
                )
            )
        if "reserved_ips" not in columns:
            connection.execute(text("ALTER TABLE groups ADD COLUMN reserved_ips JSON"))

        connection.execute(
            text(
                "UPDATE groups SET allocation_start_host = 1 WHERE allocation_start_host IS NULL"
            )
        )
        connection.execute(
            text("UPDATE groups SET reserved_ips = '[]' WHERE reserved_ips IS NULL")
        )


def _migrate_peers_table() -> None:
    inspector = inspect(engine)
    if "peers" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("peers")}
    with engine.begin() as connection:
        if "created_at" not in columns:
            connection.execute(text("ALTER TABLE peers ADD COLUMN created_at DATETIME"))
        if "updated_at" not in columns:
            connection.execute(text("ALTER TABLE peers ADD COLUMN updated_at DATETIME"))
        if "revoked_at" not in columns:
            connection.execute(text("ALTER TABLE peers ADD COLUMN revoked_at DATETIME"))
        if "last_config_generated_at" not in columns:
            connection.execute(
                text("ALTER TABLE peers ADD COLUMN last_config_generated_at DATETIME")
            )

        connection.execute(
            text(
                "UPDATE peers SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
            )
        )
        connection.execute(
            text(
                "UPDATE peers SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"
            )
        )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_groups_table()
    _migrate_peers_table()
    init_log_db()


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
            "allocation_start_host": group.allocation_start_host,
            "reserved_ips": group.reserved_ips,
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

    existing = session.scalar(
        select(Peer).where(
            Peer.user_id == payload.user_id,
            Peer.name == payload.name,
        )
    )
    if existing:
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
        description=payload.description,
        is_active=payload.is_active,
    )
    session.add(peer)
    session.commit()
    session.refresh(peer)
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
