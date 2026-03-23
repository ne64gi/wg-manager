from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

import qrcode
import qrcode.image.svg
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Group, Peer, User
from app.runtime import RuntimeService, get_runtime_service
from app.schemas import (
    GeneratedPeerArtifacts,
    GeneratedServerArtifacts,
    RevealedPeerArtifacts,
)
from app.services.audit import log_gui_event, log_operation
from app.services.domain import ensure_peer_keys, get_initial_settings, get_server_state


def get_peer_config_path(peer_name: str) -> Path:
    return get_runtime_service().peer_artifact_paths(peer_name).config_path


def get_peer_qr_path(peer_name: str) -> Path:
    return get_runtime_service().peer_artifact_paths(peer_name).qr_path


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
    interface_mtu: int | None,
) -> str:
    allowed_ips = ", ".join(_effective_allowed_ips(peer))
    lines = [
        "[Interface]",
        f"Address = {peer.assigned_ip}/32",
        f"PrivateKey = {peer.private_key}",
    ]
    if interface_mtu is not None:
        lines.append(f"MTU = {interface_mtu}")
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


def _render_server_config(
    server_address: str,
    listen_port: int,
    private_key: str,
    peers: list[Peer],
    interface_mtu: int | None,
) -> str:
    lines = [
        "[Interface]",
        f"Address = {server_address}",
        f"ListenPort = {listen_port}",
        f"PrivateKey = {private_key}",
    ]
    if interface_mtu is not None:
        lines.append(f"MTU = {interface_mtu}")
    lines.append("")
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


def _write_qr_svg(runtime_service: RuntimeService, peer_name: str, contents: str) -> Path:
    image = qrcode.make(contents, image_factory=qrcode.image.svg.SvgImage)
    buffer = BytesIO()
    image.save(buffer)
    return runtime_service.write_peer_qr(peer_name, buffer.getvalue())


def generate_peer_artifacts(
    session: Session,
    peer_id: int,
    runtime_service: RuntimeService | None = None,
) -> GeneratedPeerArtifacts:
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
        initial_settings.interface_mtu,
    )
    runtime_service = runtime_service or get_runtime_service()
    config_path = runtime_service.write_peer_config(peer.name, config_contents)
    qr_path = _write_qr_svg(runtime_service, peer.name, config_contents)

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


def generate_server_config(
    session: Session,
    runtime_service: RuntimeService | None = None,
) -> GeneratedServerArtifacts:
    server = get_server_state(session)
    initial_settings = get_initial_settings(session)
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

    runtime_service = runtime_service or get_runtime_service()
    config_path = runtime_service.write_server_config(
        _render_server_config(
            server.server_address,
            server.listen_port,
            server.private_key,
            peers,
            initial_settings.interface_mtu,
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


def get_or_generate_peer_config_text(
    session: Session,
    peer_id: int,
    runtime_service: RuntimeService | None = None,
) -> tuple[Peer, str]:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    _ensure_peer_can_generate(peer)

    initial_settings = get_initial_settings(session)
    runtime_service = runtime_service or get_runtime_service()
    paths = runtime_service.peer_artifact_paths(peer.name)
    config_path = paths.config_path
    qr_path = paths.qr_path
    if _peer_artifacts_need_regeneration(
        peer,
        initial_settings.updated_at,
        config_path,
        qr_path,
    ):
        generate_peer_artifacts(session, peer_id, runtime_service=runtime_service)
        peer = _load_peer_with_context(session, peer_id) or peer
        config_path = runtime_service.peer_artifact_paths(peer.name).config_path
    return peer, config_path.read_text(encoding="utf-8")


def get_or_generate_peer_qr_svg(
    session: Session,
    peer_id: int,
    runtime_service: RuntimeService | None = None,
) -> tuple[Peer, str]:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    _ensure_peer_can_generate(peer)

    initial_settings = get_initial_settings(session)
    runtime_service = runtime_service or get_runtime_service()
    paths = runtime_service.peer_artifact_paths(peer.name)
    config_path = paths.config_path
    qr_path = paths.qr_path
    if _peer_artifacts_need_regeneration(
        peer,
        initial_settings.updated_at,
        config_path,
        qr_path,
    ):
        generate_peer_artifacts(session, peer_id, runtime_service=runtime_service)
        peer = _load_peer_with_context(session, peer_id) or peer
        qr_path = runtime_service.peer_artifact_paths(peer.name).qr_path
    return peer, qr_path.read_text(encoding="utf-8")


def reveal_peer_artifacts(
    session: Session,
    peer_id: int,
    runtime_service: RuntimeService | None = None,
) -> RevealedPeerArtifacts:
    peer = _load_peer_with_context(session, peer_id)
    if peer is None:
        raise ValueError(f"peer id={peer_id} does not exist")
    _ensure_peer_can_generate(peer)
    if peer.is_revealed:
        raise ValueError(f"peer id={peer_id} has already been revealed")

    initial_settings = get_initial_settings(session)
    runtime_service = runtime_service or get_runtime_service()
    paths = runtime_service.peer_artifact_paths(peer.name)
    config_path = paths.config_path
    qr_path = paths.qr_path
    if _peer_artifacts_need_regeneration(
        peer,
        initial_settings.updated_at,
        config_path,
        qr_path,
    ):
        generate_peer_artifacts(session, peer_id, runtime_service=runtime_service)
        peer = _load_peer_with_context(session, peer_id) or peer
        refreshed_paths = runtime_service.peer_artifact_paths(peer.name)
        config_path = refreshed_paths.config_path
        qr_path = refreshed_paths.qr_path

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
