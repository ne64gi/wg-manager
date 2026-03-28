from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import Integer, cast, delete, func, select
from sqlalchemy.orm import Session, joinedload

from app.runtime import get_runtime_service
from app.models import Peer, PeerTrafficSnapshot, User
from app.schemas.status import (
    GroupTopologyNodeRead,
    GroupTrafficSummaryRead,
    PeerStatusRead,
    PeerTopologyNodeRead,
    SyncStateRead,
    UserTopologyNodeRead,
    UserTrafficSummaryRead,
    WireGuardOverviewHistoryPointRead,
    WireGuardOverviewRead,
)
from app.services.gui import get_gui_settings


def _is_online(latest_handshake_at: datetime | None, threshold_seconds: int) -> bool:
    if latest_handshake_at is None:
        return False
    return latest_handshake_at >= datetime.now(timezone.utc) - timedelta(
        seconds=threshold_seconds
    )


def _should_capture_snapshot(session: Session, interval_seconds: int) -> bool:
    last_captured_at = session.scalar(select(func.max(PeerTrafficSnapshot.captured_at)))
    if last_captured_at is None:
        return True
    if last_captured_at.tzinfo is None:
        last_captured_at = last_captured_at.replace(tzinfo=timezone.utc)
    return last_captured_at <= datetime.now(timezone.utc) - timedelta(
        seconds=interval_seconds
    )


def _capture_peer_snapshots(
    session: Session,
    statuses: list[PeerStatusRead],
    interval_seconds: int,
    retention_days: int,
) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    deleted_result = session.execute(
        delete(PeerTrafficSnapshot).where(PeerTrafficSnapshot.captured_at < cutoff)
    )
    deleted_any = bool(deleted_result.rowcount)

    if not statuses or not _should_capture_snapshot(session, interval_seconds):
        if deleted_any:
            try:
                session.commit()
            except Exception:
                session.rollback()
        return

    captured_at = datetime.now(timezone.utc)
    for status in statuses:
        session.add(
            PeerTrafficSnapshot(
                peer_id=status.peer_id,
                captured_at=captured_at,
                received_bytes=status.received_bytes,
                sent_bytes=status.sent_bytes,
                total_bytes=status.total_bytes,
                is_online=status.is_online,
                latest_handshake_at=status.latest_handshake_at,
            )
    )
    try:
        session.commit()
    except Exception:
        session.rollback()


def get_wireguard_peer_statuses(session: Session) -> list[PeerStatusRead]:
    gui_settings = get_gui_settings(session)
    runtime_by_key = {}
    try:
        runtime_read = get_runtime_service().read_peers()
    except ValueError:
        runtime_read = None
    if runtime_read is not None:
        runtime_by_key = {
            peer.public_key: peer for peer in runtime_read.peers if peer.public_key
        }
    peers = list(
        session.scalars(
            select(Peer)
            .options(joinedload(Peer.user).joinedload(User.group))
            .order_by(Peer.name)
        )
    )

    statuses: list[PeerStatusRead] = []
    for peer in peers:
        runtime_peer = runtime_by_key.get(peer.public_key or "")
        latest_handshake_at = runtime_peer.latest_handshake_at if runtime_peer else None
        received_bytes = runtime_peer.received_bytes if runtime_peer else 0
        sent_bytes = runtime_peer.sent_bytes if runtime_peer else 0
        statuses.append(
            PeerStatusRead(
                peer_id=peer.id,
                peer_name=peer.name,
                user_id=peer.user_id,
                user_name=peer.user.name,
                public_key=peer.public_key,
                assigned_ip=peer.assigned_ip,
                endpoint=runtime_peer.endpoint if runtime_peer else None,
                latest_handshake_at=latest_handshake_at,
                received_bytes=received_bytes,
                sent_bytes=sent_bytes,
                total_bytes=received_bytes + sent_bytes,
                is_online=_is_online(
                    latest_handshake_at, gui_settings.online_threshold_seconds
                ),
                is_active=peer.is_active,
                is_revealed=peer.is_revealed,
                description=peer.description,
                effective_allowed_ips=peer.user.allowed_ips_override
                or peer.user.group.default_allowed_ips,
            )
        )
    _capture_peer_snapshots(
        session,
        statuses,
        gui_settings.traffic_snapshot_interval_seconds,
        gui_settings.traffic_snapshot_retention_days,
    )
    return statuses


def get_wireguard_overview(session: Session) -> WireGuardOverviewRead:
    statuses = get_wireguard_peer_statuses(session)
    total_received = sum(status.received_bytes for status in statuses)
    total_sent = sum(status.sent_bytes for status in statuses)
    runtime = get_runtime_service().describe()
    return WireGuardOverviewRead(
        interface_name=runtime.interface_name,
        total_received_bytes=total_received,
        total_sent_bytes=total_sent,
        total_usage_bytes=total_received + total_sent,
        peer_count=len(statuses),
        active_peer_count=sum(1 for status in statuses if status.is_active),
        online_peer_count=sum(1 for status in statuses if status.is_online),
    )


def get_wireguard_sync_state(session: Session) -> SyncStateRead:
    runtime_service = get_runtime_service()
    runtime = runtime_service.describe()
    desired_peers = list(
        session.scalars(
            select(Peer)
            .options(joinedload(Peer.user).joinedload(User.group))
            .join(Peer.user)
            .join(User.group)
            .where(
                Peer.is_active.is_(True),
                User.is_active.is_(True),
                User.group.has(is_active=True),
            )
            .order_by(Peer.name)
        )
    )
    desired_by_key = {
        peer.public_key or "": peer
        for peer in desired_peers
        if peer.public_key
    }
    pending_generation_count = sum(
        1 for peer in desired_peers if peer.last_config_generated_at is None
    )
    last_generated_at = max(
        (peer.last_config_generated_at for peer in desired_peers if peer.last_config_generated_at),
        default=None,
    )

    try:
        runtime_read = runtime_service.read_peers()
    except ValueError as exc:
        return SyncStateRead(
            interface_name=runtime.interface_name,
            status="runtime_unavailable",
            desired_peer_count=len(desired_by_key),
            runtime_peer_count=0,
            pending_generation_count=pending_generation_count,
            drift_detected=True,
            drift_reasons=[str(exc)],
            last_generated_at=last_generated_at,
            last_runtime_sync_at=None,
        )

    runtime_by_key = {
        peer.public_key: peer
        for peer in runtime_read.peers
        if peer.public_key
    }
    runtime_keys = set(runtime_by_key)
    desired_keys = set(desired_by_key)

    drift_reasons: list[str] = []
    missing_keys = desired_keys - runtime_keys
    unexpected_keys = runtime_keys - desired_keys
    if missing_keys:
        drift_reasons.append(
            f"{len(missing_keys)} desired peers are missing from runtime"
        )
    if unexpected_keys:
        drift_reasons.append(
            f"{len(unexpected_keys)} runtime peers are not managed by current state"
        )

    allowed_ip_mismatches = 0
    for public_key in desired_keys & runtime_keys:
        desired_peer = desired_by_key[public_key]
        runtime_peer = runtime_by_key[public_key]
        desired_allowed_ips = {f"{desired_peer.assigned_ip}/32"}
        runtime_allowed_ips = set(runtime_peer.allowed_ips)
        if desired_allowed_ips != runtime_allowed_ips:
            allowed_ip_mismatches += 1
    if allowed_ip_mismatches:
        drift_reasons.append(
            f"{allowed_ip_mismatches} peers have runtime allowed IPs that differ from desired state"
        )

    drift_detected = bool(drift_reasons)
    return SyncStateRead(
        interface_name=runtime.interface_name,
        status="drifted" if drift_detected else "synced",
        desired_peer_count=len(desired_by_key),
        runtime_peer_count=len(runtime_by_key),
        pending_generation_count=pending_generation_count,
        drift_detected=drift_detected,
        drift_reasons=drift_reasons,
        last_generated_at=last_generated_at,
        last_runtime_sync_at=datetime.now(timezone.utc),
    )


def get_user_traffic_summaries(session: Session) -> list[UserTrafficSummaryRead]:
    statuses = get_wireguard_peer_statuses(session)
    grouped: dict[int, UserTrafficSummaryRead] = {}
    peer_rows = list(
        session.scalars(
            select(Peer)
            .options(joinedload(Peer.user).joinedload(User.group))
            .order_by(Peer.name)
        )
    )
    peers_by_id = {peer.id: peer for peer in peer_rows}

    for status in statuses:
        peer = peers_by_id[status.peer_id]
        current = grouped.get(status.user_id)
        if current is None:
            current = UserTrafficSummaryRead(
                user_id=status.user_id,
                user_name=status.user_name,
                group_id=peer.user.group.id,
                group_name=peer.user.group.name,
                peer_count=0,
                active_peer_count=0,
                online_peer_count=0,
                total_received_bytes=0,
                total_sent_bytes=0,
                total_usage_bytes=0,
            )
            grouped[status.user_id] = current

        current.peer_count += 1
        current.active_peer_count += 1 if status.is_active else 0
        current.online_peer_count += 1 if status.is_online else 0
        current.total_received_bytes += status.received_bytes
        current.total_sent_bytes += status.sent_bytes
        current.total_usage_bytes += status.total_bytes

    return sorted(grouped.values(), key=lambda item: (item.group_name, item.user_name))


def get_group_traffic_summaries(session: Session) -> list[GroupTrafficSummaryRead]:
    statuses = get_wireguard_peer_statuses(session)
    peer_rows = list(
        session.scalars(
            select(Peer)
            .options(joinedload(Peer.user).joinedload(User.group))
            .order_by(Peer.name)
        )
    )
    peers_by_id = {peer.id: peer for peer in peer_rows}
    grouped: dict[int, GroupTrafficSummaryRead] = {}
    seen_users: dict[int, set[int]] = {}

    for status in statuses:
        peer = peers_by_id[status.peer_id]
        group = peer.user.group
        current = grouped.get(group.id)
        if current is None:
            current = GroupTrafficSummaryRead(
                group_id=group.id,
                group_name=group.name,
                group_scope=group.scope,
                user_count=0,
                peer_count=0,
                active_peer_count=0,
                online_peer_count=0,
                total_received_bytes=0,
                total_sent_bytes=0,
                total_usage_bytes=0,
            )
            grouped[group.id] = current
            seen_users[group.id] = set()

        current.peer_count += 1
        current.active_peer_count += 1 if status.is_active else 0
        current.online_peer_count += 1 if status.is_online else 0
        current.total_received_bytes += status.received_bytes
        current.total_sent_bytes += status.sent_bytes
        current.total_usage_bytes += status.total_bytes
        if status.user_id not in seen_users[group.id]:
            seen_users[group.id].add(status.user_id)
            current.user_count += 1

    return sorted(grouped.values(), key=lambda item: item.group_name)


def get_wireguard_overview_history(
    session: Session, *, hours: int = 24
) -> list[WireGuardOverviewHistoryPointRead]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = session.execute(
        select(
            PeerTrafficSnapshot.captured_at,
            func.sum(PeerTrafficSnapshot.received_bytes),
            func.sum(PeerTrafficSnapshot.sent_bytes),
            func.sum(PeerTrafficSnapshot.total_bytes),
            func.sum(cast(PeerTrafficSnapshot.is_online, Integer)),
        )
        .where(PeerTrafficSnapshot.captured_at >= cutoff)
        .group_by(PeerTrafficSnapshot.captured_at)
        .order_by(PeerTrafficSnapshot.captured_at.asc())
    ).all()

    history: list[WireGuardOverviewHistoryPointRead] = []
    for captured_at, total_received, total_sent, total_usage, online_count in rows:
        history.append(
            WireGuardOverviewHistoryPointRead(
                captured_at=captured_at,
                total_received_bytes=int(total_received or 0),
                total_sent_bytes=int(total_sent or 0),
                total_usage_bytes=int(total_usage or 0),
                online_peer_count=int(online_count or 0),
            )
        )
    return history


def get_wireguard_topology(session: Session) -> list[GroupTopologyNodeRead]:
    statuses = get_wireguard_peer_statuses(session)
    statuses_by_peer_id = {status.peer_id: status for status in statuses}
    peer_rows = list(
        session.scalars(
            select(Peer)
            .options(joinedload(Peer.user).joinedload(User.group))
            .order_by(Peer.user_id, Peer.name)
        )
    )

    groups: dict[int, GroupTopologyNodeRead] = {}
    users_by_group: dict[tuple[int, int], UserTopologyNodeRead] = {}
    for peer in peer_rows:
        status = statuses_by_peer_id.get(peer.id)
        if status is None:
            continue

        group = peer.user.group
        group_node = groups.get(group.id)
        if group_node is None:
            group_node = GroupTopologyNodeRead(
                group_id=group.id,
                group_name=group.name,
                group_scope=group.scope,
                is_active=group.is_active,
                user_count=0,
                peer_count=0,
                active_peer_count=0,
                online_peer_count=0,
                users=[],
            )
            groups[group.id] = group_node

        user_key = (group.id, peer.user.id)
        user_node = users_by_group.get(user_key)
        if user_node is None:
            user_node = UserTopologyNodeRead(
                user_id=peer.user.id,
                user_name=peer.user.name,
                is_active=peer.user.is_active,
                peer_count=0,
                active_peer_count=0,
                online_peer_count=0,
                peers=[],
            )
            users_by_group[user_key] = user_node
            group_node.users.append(user_node)
            group_node.user_count += 1

        user_node.peers.append(
            PeerTopologyNodeRead(
                peer_id=peer.id,
                peer_name=peer.name,
                assigned_ip=peer.assigned_ip,
                is_active=peer.is_active,
                is_online=status.is_online,
                is_revealed=peer.is_revealed,
                latest_handshake_at=status.latest_handshake_at,
                total_bytes=status.total_bytes,
            )
        )
        user_node.peer_count += 1
        user_node.active_peer_count += 1 if peer.is_active else 0
        user_node.online_peer_count += 1 if status.is_online else 0
        group_node.peer_count += 1
        group_node.active_peer_count += 1 if peer.is_active else 0
        group_node.online_peer_count += 1 if status.is_online else 0

    return sorted(groups.values(), key=lambda item: item.group_name)
