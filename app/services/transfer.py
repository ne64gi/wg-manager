from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Group, Peer, User
from app.schemas import GroupCreate, InitialSettingsRead, InitialSettingsUpdate, UserCreate
from app.schemas.config import BundleWarningRead
from app.schemas.gui import GuiSettingsUpdate
from app.schemas.state import (
    StateExportRead,
    StateExportGroup,
    StateExportGuiSettings,
    StateExportPeer,
    StateExportServerState,
    StateImportRequest,
    StateImportResultRead,
    StateExportUser,
)
from app.services.audit import log_gui_event, log_operation
from app.services.config_generation import reveal_peer_artifacts
from app.services.domain import (
    create_group,
    create_user,
    get_initial_settings,
    get_server_state,
    list_groups,
    reissue_peer_keys,
    update_initial_settings,
)
from app.services.gui import get_gui_settings, update_gui_settings


def _sanitize_name(value: str) -> str:
    return "".join(character if character.isalnum() or character in ("-", "_") else "-" for character in value)


def _load_group_with_context(session: Session, group_id: int) -> Group | None:
    return session.scalar(
        select(Group)
        .options(joinedload(Group.users).joinedload(User.peers))
        .where(Group.id == group_id)
    )


def _load_user_with_context(session: Session, user_id: int) -> User | None:
    return session.scalar(
        select(User)
        .options(joinedload(User.group), joinedload(User.peers))
        .where(User.id == user_id)
    )


def get_group_bundle_warning(session: Session, group_id: int) -> BundleWarningRead:
    group = _load_group_with_context(session, group_id)
    if group is None:
        raise ValueError(f"group id={group_id} does not exist")
    peer_count = sum(
        1
        for user in group.users
        if user.is_active
        for peer in user.peers
        if peer.is_active
    )
    return BundleWarningRead(
        message=(
            "This bundle will reissue keys for all eligible peers in the group, "
            "mark them as revealed, and package the new configs into a zip archive."
        ),
        peer_count=peer_count,
    )


def get_user_bundle_warning(session: Session, user_id: int) -> BundleWarningRead:
    user = _load_user_with_context(session, user_id)
    if user is None:
        raise ValueError(f"user id={user_id} does not exist")
    peer_count = sum(1 for peer in user.peers if peer.is_active)
    return BundleWarningRead(
        message=(
            "This bundle will reissue keys for all eligible peers for the user, "
            "mark them as revealed, and package the new configs into a zip archive."
        ),
        peer_count=peer_count,
    )


def _bundle_notice(scope_label: str, scope_name: str, peer_count: int) -> str:
    return "\n".join(
        [
            "wg-studio bulk peer bundle",
            "",
            f"Scope: {scope_label} {scope_name}",
            f"Peer count: {peer_count}",
            "",
            "Warning:",
            "- Keys were reissued before this archive was created.",
            "- Previous peer configs are no longer valid.",
            "- Apply the updated server config before using these peer files.",
            "- Each peer in this archive is now marked as revealed.",
        ]
    )


def _zip_revealed_peers(
    session: Session,
    peers: list[Peer],
    *,
    scope_label: str,
    scope_name: str,
) -> tuple[bytes, str]:
    eligible_peers = [
        peer
        for peer in peers
        if peer.is_active and peer.user.is_active and peer.user.group.is_active
    ]
    if not eligible_peers:
        raise ValueError("no eligible active peers found for bundle download")

    for peer in eligible_peers:
        reissue_peer_keys(session, peer.id)

    buffer = BytesIO()
    bundle_name = f"{_sanitize_name(scope_name)}-peers.zip"
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as archive:
        archive.writestr(
            "NOTICE.txt",
            _bundle_notice(scope_label, scope_name, len(eligible_peers)),
        )
        for peer in eligible_peers:
            artifacts = reveal_peer_artifacts(session, peer.id)
            group_dir = _sanitize_name(peer.user.group.name)
            user_dir = _sanitize_name(peer.user.name)
            peer_dir = _sanitize_name(peer.name)
            archive.writestr(
                f"{group_dir}/{user_dir}/{peer_dir}.conf",
                artifacts.config_text,
            )
            archive.writestr(
                f"{group_dir}/{user_dir}/{peer_dir}.svg",
                artifacts.qr_svg,
            )

    now = datetime.now(timezone.utc)
    log_operation(
        "peer.bundle_download",
        "bundle",
        0,
        source="service",
        details={
            "scope_label": scope_label,
            "scope_name": scope_name,
            "peer_count": len(eligible_peers),
            "generated_at": now.isoformat(),
        },
    )
    log_gui_event(
        "warning",
        "secret",
        "Bulk peer bundle downloaded",
        details={
            "scope_label": scope_label,
            "scope_name": scope_name,
            "peer_count": len(eligible_peers),
            "generated_at": now.isoformat(),
        },
    )
    return buffer.getvalue(), bundle_name


def build_group_peer_bundle(session: Session, group_id: int) -> tuple[bytes, str]:
    group = _load_group_with_context(session, group_id)
    if group is None:
        raise ValueError(f"group id={group_id} does not exist")
    peers = [peer for user in group.users for peer in user.peers]
    return _zip_revealed_peers(
        session,
        peers,
        scope_label="group",
        scope_name=group.name,
    )


def build_user_peer_bundle(session: Session, user_id: int) -> tuple[bytes, str]:
    user = _load_user_with_context(session, user_id)
    if user is None:
        raise ValueError(f"user id={user_id} does not exist")
    return _zip_revealed_peers(
        session,
        list(user.peers),
        scope_label="user",
        scope_name=user.name,
    )


def export_domain_state(session: Session) -> StateExportRead:
    server_state = get_server_state(session)
    initial_settings = get_initial_settings(session)
    gui_settings = get_gui_settings(session)
    groups = [
        session.scalar(
            select(Group)
            .options(joinedload(Group.users).joinedload(User.peers))
            .where(Group.id == group.id)
        )
        for group in list_groups(session)
    ]

    return StateExportRead(
        exported_at=datetime.now(timezone.utc),
        server_state=StateExportServerState(
            endpoint=server_state.endpoint,
            listen_port=server_state.listen_port,
            server_address=server_state.server_address,
            dns=server_state.dns,
            interface_mtu=initial_settings.interface_mtu,
            private_key=server_state.private_key,
            public_key=server_state.public_key,
        ),
        initial_settings=InitialSettingsRead.model_validate(initial_settings),
        gui_settings=StateExportGuiSettings(
            theme_mode=gui_settings.theme_mode,
            default_locale=gui_settings.default_locale,
            overview_refresh_seconds=gui_settings.overview_refresh_seconds,
            peers_refresh_seconds=gui_settings.peers_refresh_seconds,
            traffic_snapshot_interval_seconds=gui_settings.traffic_snapshot_interval_seconds,
            refresh_after_apply=gui_settings.refresh_after_apply,
            online_threshold_seconds=gui_settings.online_threshold_seconds,
            error_log_level=gui_settings.error_log_level,
            access_log_path=gui_settings.access_log_path,
            error_log_path=gui_settings.error_log_path,
        ),
        groups=[
            StateExportGroup(
                name=group.name,
                scope=group.scope,
                network_cidr=group.network_cidr,
                default_allowed_ips=group.default_allowed_ips,
                dns_servers=group.dns_servers,
                allocation_start_host=group.allocation_start_host,
                reserved_ips=group.reserved_ips,
                description=group.description,
                is_active=group.is_active,
                users=[
                    StateExportUser(
                        name=user.name,
                        allowed_ips_override=user.allowed_ips_override,
                        description=user.description,
                        is_active=user.is_active,
                        peers=[
                            StateExportPeer(
                                name=peer.name,
                                assigned_ip=peer.assigned_ip,
                                description=peer.description,
                                is_active=peer.is_active,
                                private_key=peer.private_key,
                                public_key=peer.public_key,
                                preshared_key=peer.preshared_key,
                                last_config_generated_at=peer.last_config_generated_at,
                                is_revealed=peer.is_revealed,
                                revealed_at=peer.revealed_at,
                                revoked_at=peer.revoked_at,
                            )
                            for peer in sorted(user.peers, key=lambda item: item.name)
                        ],
                    )
                    for user in sorted(group.users, key=lambda item: item.name)
                ],
            )
            for group in groups
            if group is not None
        ],
    )


def import_domain_state(
    session: Session,
    payload: StateImportRequest,
) -> StateImportResultRead:
    groups = list(
        session.scalars(
            select(Group)
            .options(joinedload(Group.users).joinedload(User.peers))
            .order_by(Group.name)
        )
    )
    for group in groups:
        session.delete(group)
    session.commit()

    imported_group_count = 0
    imported_user_count = 0
    imported_peer_count = 0

    for group_payload in payload.groups:
        group = create_group(
            session,
            GroupCreate(
                name=group_payload.name,
                scope=group_payload.scope,
                network_cidr=group_payload.network_cidr,
                default_allowed_ips=group_payload.default_allowed_ips,
                dns_servers=group_payload.dns_servers,
                allocation_start_host=group_payload.allocation_start_host,
                reserved_ips=group_payload.reserved_ips,
                description=group_payload.description,
                is_active=group_payload.is_active,
            ),
        )
        imported_group_count += 1

        for user_payload in group_payload.users:
            user = create_user(
                session,
                UserCreate(
                    group_id=group.id,
                    name=user_payload.name,
                    allowed_ips_override=user_payload.allowed_ips_override,
                    description=user_payload.description,
                    is_active=user_payload.is_active,
                ),
            )
            imported_user_count += 1

            for peer_payload in user_payload.peers:
                peer = Peer(
                    user_id=user.id,
                    name=peer_payload.name,
                    assigned_ip=peer_payload.assigned_ip,
                    private_key=peer_payload.private_key,
                    public_key=peer_payload.public_key,
                    preshared_key=peer_payload.preshared_key,
                    description=peer_payload.description,
                    is_active=peer_payload.is_active,
                    last_config_generated_at=peer_payload.last_config_generated_at,
                    is_revealed=peer_payload.is_revealed,
                    revealed_at=peer_payload.revealed_at,
                    revoked_at=peer_payload.revoked_at,
                )
                session.add(peer)
                session.commit()
                imported_peer_count += 1

    initial_settings = update_initial_settings(
        session,
        InitialSettingsUpdate(
            endpoint_address=payload.initial_settings.endpoint_address,
            endpoint_port=payload.initial_settings.endpoint_port,
            interface_mtu=payload.initial_settings.interface_mtu,
        ),
    )
    gui_settings = update_gui_settings(
        session,
        GuiSettingsUpdate(**payload.gui_settings.model_dump()),
    )
    server_state = get_server_state(session)
    server_state.endpoint = payload.server_state.endpoint
    server_state.listen_port = payload.server_state.listen_port
    server_state.server_address = payload.server_state.server_address
    server_state.dns = payload.server_state.dns
    server_state.private_key = payload.server_state.private_key
    server_state.public_key = payload.server_state.public_key
    server_state.updated_at = datetime.now(timezone.utc)
    session.commit()

    imported_at = datetime.now(timezone.utc)
    log_operation(
        "state.import",
        "state",
        1,
        source="service",
        details={
            "imported_group_count": imported_group_count,
            "imported_user_count": imported_user_count,
            "imported_peer_count": imported_peer_count,
            "imported_at": imported_at.isoformat(),
            "endpoint_address": initial_settings.endpoint_address,
            "interface_mtu": initial_settings.interface_mtu,
            "theme_mode": gui_settings.theme_mode,
        },
    )
    return StateImportResultRead(
        imported_group_count=imported_group_count,
        imported_user_count=imported_user_count,
        imported_peer_count=imported_peer_count,
        imported_at=imported_at,
    )
