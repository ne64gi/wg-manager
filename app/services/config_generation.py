from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

import qrcode
import qrcode.image.svg
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.runtime import ArtifactStore, get_artifact_store
from app.models import Group, Peer, User
from app.schemas import (
    GeneratedPeerArtifacts,
    GeneratedServerArtifacts,
    RevealedPeerArtifacts,
)
from app.services.audit import log_gui_event, log_operation
from app.services.domain import ensure_peer_keys, get_initial_settings, get_server_state


def _server_config_path(store: ArtifactStore):
    return store.server_config_path()


def _peer_config_path(store: ArtifactStore, peer_name: str):
    return store.peer_config_path(peer_name)


def _peer_qr_path(store: ArtifactStore, peer_name: str):
    return store.peer_qr_path(peer_name)


def get_peer_config_path(peer_name: str) -> Path:
    return _peer_config_path(get_artifact_store(), peer_name)


def get_peer_qr_path(peer_name: str) -> Path:
    return _peer_qr_path(get_artifact_store(), peer_name)


def _effective_allowed_ips(peer: Peer) -> list[str]:
    return peer.user.allowed_ips_override or peer.user.group.default_allowed_ips


def _load_peer_with_context(session: Session, peer_id: int) -> Peer | None:
    return session.scalar(
        select(Peer)
        .options(joinedload(Peer.user).joinedload(User.group))
        .where(Peer.id == peer_id)
    )


def _ensure_peer_can_generate(peer: Peer) -> None:
    if not peer.is_active:
        raise ValueError(f"peer id={peer.id} is inactive")
    if not peer.user.is_active:
        raise ValueError(f"user id={peer.user_id} is inactive")
    if not peer.user.group.is_active:
        raise ValueError(f"group id={peer.user.group_id} is inactive")


def _peer_artifacts_need_regeneration(
    peer: Peer,
    initial_settings_updated_at: datetime,
    config_path: Path,
    qr_path: Path,
) -> bool:
    if not config_path.exists() or not qr_path.exists():
        return True
    if peer.last_config_generated_at is None:
        return True
    if peer.updated_at > peer.last_config_generated_at:
        return True
    if initial_settings_updated_at > peer.last_config_generated_at:
        return True
    return False


def _render_peer_config(
    peer: Peer,
    server_endpoint: str,
    server_port: int,
    server_public_key: str,
) -> str:
    allowed_ips = ", ".join(_effective_allowed_ips(peer))
    lines = [
        "[Interface]",
        f"Address = {peer.assigned_ip}/32",
        f"PrivateKey = {peer.private_key}",
    ]
    if peer.user.group.dns_servers:
        lines.append(f"DNS = {', '.join(peer.user.group.dns_servers)}")
    lines.extend(
        [
            "",
            "[Peer]",
            f"# User = {peer.user.name}",
            f"# Name = {peer.name}",
            f"PublicKey = {server_public_key}",
            f"PresharedKey = {peer.preshared_key}",
            f"Endpoint = {server_endpoint}:{server_port}",
            f"AllowedIPs = {allowed_ips}",
            "PersistentKeepalive = 25",
            "",
        ]
    )
    return "\n".join(lines)


def _render_server_config(server_address: str, listen_port: int, private_key: str, peers: list[Peer]) -> str:
    lines = [
        "[Interface]",
        f"Address = {server_address}",
        f"ListenPort = {listen_port}",
        f"PrivateKey = {private_key}",
        "",
    ]
    for peer in peers:
        lines.extend(
            [
                "[Peer]",
                f"# User = {peer.user.name}",
                f"# Name = {peer.name}",
                f"PublicKey = {peer.public_key}",
                f"PresharedKey = {peer.preshared_key}",
                f"AllowedIPs = {peer.assigned_ip}/32",
                "",
            ]
        )
    return "\n".join(lines)


def _write_qr_svg(store: ArtifactStore, contents: str, path: Path) -> None:
    image = qrcode.make(contents, image_factory=qrcode.image.svg.SvgImage)
    buffer = BytesIO()
    image.save(buffer)
    store.write_bytes(path, buffer.getvalue())


def generate_peer_artifacts(session: Session, peer_id: int) -> GeneratedPeerArtifacts:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    _ensure_peer_can_generate(peer)

    ensure_peer_keys(session, peer)
    initial_settings = get_initial_settings(session)
    server = get_server_state(session)

    config_contents = _render_peer_config(
        peer,
        initial_settings.endpoint_address,
        initial_settings.endpoint_port,
        server.public_key,
    )
    store = get_artifact_store()
    config_path = _peer_config_path(store, peer.name)
    qr_path = _peer_qr_path(store, peer.name)
    store.write_text(config_path, config_contents)
    _write_qr_svg(store, config_contents, qr_path)

    peer.last_config_generated_at = datetime.now(timezone.utc)
    peer.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(peer)

    log_operation(
        "peer.generate_config",
        "peer",
        peer.id,
        source="service",
        details={
            "config_path": str(config_path),
            "qr_path": str(qr_path),
        },
    )

    return GeneratedPeerArtifacts(
        peer_id=peer.id,
        peer_name=peer.name,
        config_path=str(config_path),
        qr_path=str(qr_path),
        last_config_generated_at=peer.last_config_generated_at,
    )


def generate_server_config(session: Session) -> GeneratedServerArtifacts:
    server = get_server_state(session)
    peers = list(
        session.scalars(
            select(Peer)
            .options(joinedload(Peer.user).joinedload(User.group))
            .join(Peer.user)
            .join(User.group)
            .where(
                Peer.is_active.is_(True),
                User.is_active.is_(True),
                Group.is_active.is_(True),
            )
            .order_by(Peer.name)
        )
    )
    for peer in peers:
        ensure_peer_keys(session, peer)

    store = get_artifact_store()
    config_path = _server_config_path(store)
    store.write_text(
        config_path,
        _render_server_config(
            server.server_address,
            server.listen_port,
            server.private_key,
            peers,
        ),
    )

    log_operation(
        "server.generate_config",
        "server",
        server.id,
        source="service",
        details={
            "config_path": str(config_path),
            "peer_count": len(peers),
        },
    )

    return GeneratedServerArtifacts(
        server_config_path=str(config_path),
        peer_count=len(peers),
    )


def get_or_generate_peer_config_text(session: Session, peer_id: int) -> tuple[Peer, str]:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    _ensure_peer_can_generate(peer)

    initial_settings = get_initial_settings(session)
    store = get_artifact_store()
    config_path = _peer_config_path(store, peer.name)
    qr_path = _peer_qr_path(store, peer.name)
    if _peer_artifacts_need_regeneration(
        peer,
        initial_settings.updated_at,
        config_path,
        qr_path,
    ):
        generate_peer_artifacts(session, peer_id)
        peer = _load_peer_with_context(session, peer_id) or peer
        config_path = _peer_config_path(store, peer.name)
    return peer, config_path.read_text(encoding="utf-8")


def get_or_generate_peer_qr_svg(session: Session, peer_id: int) -> tuple[Peer, str]:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    _ensure_peer_can_generate(peer)

    initial_settings = get_initial_settings(session)
    store = get_artifact_store()
    config_path = _peer_config_path(store, peer.name)
    qr_path = _peer_qr_path(store, peer.name)
    if _peer_artifacts_need_regeneration(
        peer,
        initial_settings.updated_at,
        config_path,
        qr_path,
    ):
        generate_peer_artifacts(session, peer_id)
        peer = _load_peer_with_context(session, peer_id) or peer
        qr_path = _peer_qr_path(store, peer.name)
    return peer, qr_path.read_text(encoding="utf-8")


def reveal_peer_artifacts(session: Session, peer_id: int) -> RevealedPeerArtifacts:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    _ensure_peer_can_generate(peer)
    if peer.is_revealed:
        raise ValueError(f"peer id={peer_id} has already been revealed")

    initial_settings = get_initial_settings(session)
    store = get_artifact_store()
    config_path = _peer_config_path(store, peer.name)
    qr_path = _peer_qr_path(store, peer.name)
    if _peer_artifacts_need_regeneration(
        peer,
        initial_settings.updated_at,
        config_path,
        qr_path,
    ):
        generate_peer_artifacts(session, peer_id)
        peer = _load_peer_with_context(session, peer_id) or peer
        config_path = _peer_config_path(store, peer.name)
        qr_path = _peer_qr_path(store, peer.name)

    revealed_at = datetime.now(timezone.utc)
    peer.is_revealed = True
    peer.revealed_at = revealed_at
    peer.updated_at = revealed_at
    session.commit()
    session.refresh(peer)

    log_operation(
        "peer.reveal_artifacts",
        "peer",
        peer.id,
        source="service",
        details={"revealed_at": revealed_at.isoformat()},
    )
    log_gui_event(
        "warning",
        "secret",
        "Peer artifacts revealed",
        details={
            "peer_id": peer.id,
            "peer_name": peer.name,
            "revealed_at": revealed_at.isoformat(),
        },
    )

    return RevealedPeerArtifacts(
        peer_id=peer.id,
        peer_name=peer.name,
        config_text=config_path.read_text(encoding="utf-8"),
        qr_svg=qr_path.read_text(encoding="utf-8"),
        revealed_at=revealed_at,
    )
