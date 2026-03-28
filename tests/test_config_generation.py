from pathlib import Path

from app.core import settings
from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope
from app.schemas import GroupCreate, PeerCreate, UserCreate
from app.services import (
    create_group,
    create_peer,
    create_user,
    generate_peer_artifacts,
    generate_server_config,
    get_or_generate_peer_config_text,
    get_or_generate_peer_qr_svg,
    preview_server_config,
    update_initial_settings,
)
from app.schemas import InitialSettingsUpdate


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_generate_peer_artifacts_writes_conf_and_qr(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_endpoint = settings.server_endpoint
    previous_address = settings.server_address

    settings.artifact_root = str(tmp_path)
    settings.server_endpoint = "vpn.test.local"
    settings.server_address = "10.99.0.1/24"

    try:
        with SessionLocal() as session:
            group = create_group(
                session,
                GroupCreate(
                    name="corp-c",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.50.1.0/24",
                    default_allowed_ips=["10.50.1.0/24"],
                    dns_servers=["1.1.1.1", "8.8.8.8"],
                ),
            )
            user = create_user(
                session,
                UserCreate(
                    group_id=group.id,
                    name="charlie",
                    allowed_ips_override=["10.50.1.254/32"],
                ),
            )
            peer = create_peer(session, PeerCreate(user_id=user.id, name="charlie-pc"))

            artifacts = generate_peer_artifacts(session, peer.id)
            session.refresh(peer)

        conf_text = Path(artifacts.config_path).read_text(encoding="utf-8")
        qr_text = Path(artifacts.qr_path).read_text(encoding="utf-8")

        assert "Address = 10.50.1.1/32" in conf_text
        assert "DNS = 1.1.1.1, 8.8.8.8" in conf_text
        assert "AllowedIPs = 10.50.1.254/32" in conf_text
        assert "Endpoint = vpn.test.local:51820" in conf_text
        assert "PersistentKeepalive = 25" in conf_text
        assert "<svg" in qr_text
        assert peer.last_config_generated_at is not None
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address


def test_generate_peer_artifacts_omits_dns_when_group_dns_is_null(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_endpoint = settings.server_endpoint
    previous_address = settings.server_address

    settings.artifact_root = str(tmp_path)
    settings.server_endpoint = "vpn.test.local"
    settings.server_address = "10.99.0.1/24"

    try:
        with SessionLocal() as session:
            group = create_group(
                session,
                GroupCreate(
                    name="corp-d",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.51.1.0/24",
                    default_allowed_ips=["10.51.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="delta"))
            peer = create_peer(session, PeerCreate(user_id=user.id, name="delta-pc"))
            artifacts = generate_peer_artifacts(session, peer.id)

        conf_text = Path(artifacts.config_path).read_text(encoding="utf-8")
        assert "DNS =" not in conf_text
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address


def test_generate_server_config_includes_only_active_peers(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_address = settings.server_address
    settings.artifact_root = str(tmp_path)
    settings.server_address = "10.99.0.1/24"

    try:
        with SessionLocal() as session:
            group = create_group(
                session,
                GroupCreate(
                    name="corp-s",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.60.1.0/24",
                    default_allowed_ips=["10.60.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="sora"))
            active_peer = create_peer(session, PeerCreate(user_id=user.id, name="sora-pc"))
            create_peer(
                session,
                PeerCreate(user_id=user.id, name="sora-phone", is_active=False, assigned_ip="10.60.1.2"),
            )

            artifacts = generate_server_config(session)

        config_text = Path(artifacts.server_config_path).read_text(encoding="utf-8")
        assert "Name = sora-pc" in config_text
        assert "AllowedIPs = 10.60.1.1/32" in config_text
        assert "Name = sora-phone" not in config_text
        assert artifacts.peer_count == 1
        assert active_peer.public_key is not None
    finally:
        settings.artifact_root = previous_root
        settings.server_address = previous_address


def test_generate_peer_artifacts_uses_updated_initial_settings(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_endpoint = settings.server_endpoint
    previous_address = settings.server_address

    settings.artifact_root = str(tmp_path)
    settings.server_endpoint = "vpn.example.com"
    settings.server_address = "10.99.0.1/24"

    try:
        with SessionLocal() as session:
            update_initial_settings(
                session,
                InitialSettingsUpdate(
                    endpoint_address="eip.sys-sol.jp",
                    endpoint_port=51820,
                    interface_mtu=1380,
                ),
            )
            group = create_group(
                session,
                GroupCreate(
                    name="corp-e",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.61.1.0/24",
                    default_allowed_ips=["10.61.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="echo"))
            peer = create_peer(session, PeerCreate(user_id=user.id, name="echo-pc"))
            artifacts = generate_peer_artifacts(session, peer.id)

        conf_text = Path(artifacts.config_path).read_text(encoding="utf-8")
        assert "Endpoint = eip.sys-sol.jp:51820" in conf_text
        assert "MTU = 1380" in conf_text
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address


def test_generate_server_config_includes_interface_mtu_when_configured(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_address = settings.server_address
    settings.artifact_root = str(tmp_path)
    settings.server_address = "10.99.0.1/24"

    try:
        with SessionLocal() as session:
            update_initial_settings(
                session,
                InitialSettingsUpdate(
                    endpoint_address="vpn.example.test",
                    endpoint_port=51820,
                    interface_mtu=1420,
                ),
            )
            group = create_group(
                session,
                GroupCreate(
                    name="corp-mtu",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.63.1.0/24",
                    default_allowed_ips=["10.63.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="mtu-user"))
            create_peer(session, PeerCreate(user_id=user.id, name="mtu-peer"))

            artifacts = generate_server_config(session)

        config_text = Path(artifacts.server_config_path).read_text(encoding="utf-8")
        assert "MTU = 1420" in config_text
    finally:
        settings.artifact_root = previous_root
        settings.server_address = previous_address


def test_preview_server_config_returns_diff_without_overwriting_current_file(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_address = settings.server_address
    settings.artifact_root = str(tmp_path)
    settings.server_address = "10.99.0.1/24"

    current_config_path = tmp_path / "wg_confs" / "wg0.conf"
    current_config_path.parent.mkdir(parents=True, exist_ok=True)
    current_config_path.write_text(
        "[Interface]\nAddress = 10.99.0.1/24\n\n[Peer]\n# Name = stale-peer\nAllowedIPs = 10.63.1.99/32\n",
        encoding="utf-8",
    )

    try:
        with SessionLocal() as session:
            group = create_group(
                session,
                GroupCreate(
                    name="corp-preview",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.64.1.0/24",
                    default_allowed_ips=["10.64.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="preview-user"))
            create_peer(session, PeerCreate(user_id=user.id, name="preview-peer"))

            preview = preview_server_config(session)

        assert preview.has_changes is True
        assert preview.peer_count == 1
        assert "Name = preview-peer" in preview.candidate_config_text
        assert "Name = stale-peer" in preview.current_config_text
        assert "--- current/wg0.conf" in preview.unified_diff
        assert "+++ candidate/wg0.conf" in preview.unified_diff
        assert current_config_path.read_text(encoding="utf-8").startswith("[Interface]\nAddress = 10.99.0.1/24")
    finally:
        settings.artifact_root = previous_root
        settings.server_address = previous_address


def test_get_or_generate_peer_config_and_qr(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_endpoint = settings.server_endpoint
    previous_address = settings.server_address

    settings.artifact_root = str(tmp_path)
    settings.server_endpoint = "vpn.test.local"
    settings.server_address = "10.99.0.1/24"

    try:
        with SessionLocal() as session:
            group = create_group(
                session,
                GroupCreate(
                    name="corp-f",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.62.1.0/24",
                    default_allowed_ips=["10.62.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="foxtrot"))
            peer = create_peer(session, PeerCreate(user_id=user.id, name="foxtrot-pc"))

            _, conf_text = get_or_generate_peer_config_text(session, peer.id)
            _, qr_svg = get_or_generate_peer_qr_svg(session, peer.id)

        assert "Address = 10.62.1.1/32" in conf_text
        assert "Endpoint = vpn.test.local:51820" in conf_text
        assert "<svg" in qr_svg
        assert (tmp_path / "peers" / "foxtrot-pc.conf").exists()
        assert (tmp_path / "peers" / "foxtrot-pc.svg").exists()
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address
