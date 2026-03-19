from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core import settings
from app.models import Peer, User
from app.schemas import (
    GroupTrafficSummaryRead,
    PeerStatusRead,
    UserTrafficSummaryRead,
    WireGuardOverviewRead,
)
from app.services.docker_runtime import docker_exec
from app.services.gui import get_gui_settings


@dataclass
class RuntimePeerStats:
    public_key: str
    endpoint: str | None
    allowed_ips: list[str]
    latest_handshake_at: datetime | None
    received_bytes: int
    sent_bytes: int


def _parse_handshake_epoch(value: str) -> datetime | None:
    epoch = int(value)
    if epoch <= 0:
        return None
    return datetime.fromtimestamp(epoch, tz=timezone.utc)


def _parse_wg_dump(raw: str) -> list[RuntimePeerStats]:
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if not lines:
        return []

    peers: list[RuntimePeerStats] = []
    for line in lines[1:]:
        columns = line.split("\t")
        if len(columns) < 8:
            continue
        peers.append(
            RuntimePeerStats(
                public_key=columns[0],
                endpoint=None if columns[2] == "(none)" else columns[2],
                allowed_ips=[] if columns[3] == "(none)" else columns[3].split(","),
                latest_handshake_at=_parse_handshake_epoch(columns[4]),
                received_bytes=int(columns[5]),
                sent_bytes=int(columns[6]),
            )
        )
    return peers


def _is_online(latest_handshake_at: datetime | None, threshold_seconds: int) -> bool:
    if latest_handshake_at is None:
        return False
    return latest_handshake_at >= datetime.now(timezone.utc) - timedelta(
        seconds=threshold_seconds
    )


def get_wireguard_peer_statuses(session: Session) -> list[PeerStatusRead]:
    gui_settings = get_gui_settings(session)
    result = docker_exec(["wg", "show", settings.wireguard_interface_name, "dump"], capture_output=True)
    if result.exit_code != 0:
        stderr = result.stderr.strip() or "wg show dump failed"
        raise ValueError(stderr)

    runtime_by_key = {
        peer.public_key: peer for peer in _parse_wg_dump(result.stdout) if peer.public_key
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
        runtime = runtime_by_key.get(peer.public_key or "")
        latest_handshake_at = runtime.latest_handshake_at if runtime else None
        received_bytes = runtime.received_bytes if runtime else 0
        sent_bytes = runtime.sent_bytes if runtime else 0
        statuses.append(
            PeerStatusRead(
                peer_id=peer.id,
                peer_name=peer.name,
                user_id=peer.user_id,
                user_name=peer.user.name,
                public_key=peer.public_key,
                assigned_ip=peer.assigned_ip,
                endpoint=runtime.endpoint if runtime else None,
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
    return statuses


def get_wireguard_overview(session: Session) -> WireGuardOverviewRead:
    statuses = get_wireguard_peer_statuses(session)
    total_received = sum(status.received_bytes for status in statuses)
    total_sent = sum(status.sent_bytes for status in statuses)
    return WireGuardOverviewRead(
        interface_name=settings.wireguard_interface_name,
        total_received_bytes=total_received,
        total_sent_bytes=total_sent,
        total_usage_bytes=total_received + total_sent,
        peer_count=len(statuses),
        active_peer_count=sum(1 for status in statuses if status.is_active),
        online_peer_count=sum(1 for status in statuses if status.is_online),
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
