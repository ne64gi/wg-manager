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
)


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
