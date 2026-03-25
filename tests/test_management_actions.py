from pathlib import Path

from app.core import settings
from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope
from app.schemas import GroupCreate, GroupUpdate, InitialSettingsUpdate, PeerCreate, PeerUpdate, UserCreate, UserUpdate
from app.services import (
    create_group,
    create_peer,
    create_user,
    generate_peer_artifacts,
    generate_server_config,
    get_initial_settings,
    get_server_state,
    reissue_peer_keys,
    reveal_peer_artifacts,
    update_initial_settings,
    update_group,
    update_peer,
    update_user,
)


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_update_entities_and_reissue_peer_keys(tmp_path: Path) -> None:
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
                    name="corp-manage",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.80.1.0/24",
                    default_allowed_ips=["10.80.1.0/24"],
                    dns_servers=["1.1.1.1"],
                ),
            )
            user = create_user(
                session,
                UserCreate(
                    group_id=group.id,
                    name="alice",
                    allowed_ips_override=["10.80.1.254/32"],
                    description="old user",
                ),
            )
            peer = create_peer(
                session,
                PeerCreate(
                    user_id=user.id,
                    name="alice-pc",
                    assigned_ip="10.80.1.10",
                    description="old peer",
                ),
            )

            first_reveal = reveal_peer_artifacts(session, peer.id)
            original_private_key = peer.private_key
            original_public_key = peer.public_key
            original_preshared_key = peer.preshared_key

            group = update_group(
                session,
                group.id,
                GroupUpdate(
                    name="corp-manage-updated",
                    default_allowed_ips=["10.80.1.0/24", "10.80.2.0/24"],
                    dns_servers=None,
                    description="updated group",
                ),
            )
            user = update_user(
                session,
                user.id,
                UserUpdate(
                    name="alice-renamed",
                    allowed_ips_override=None,
                    description="updated user",
                ),
            )
            peer = update_peer(
                session,
                peer.id,
                PeerUpdate(
                    name="alice-laptop",
                    assigned_ip="10.80.1.11",
                    description="updated peer",
                ),
            )

            peer = reissue_peer_keys(session, peer.id)
            assert peer.last_config_generated_at is None
            second_reveal = reveal_peer_artifacts(session, peer.id)

            assert group.name == "corp-manage-updated"
            assert group.default_allowed_ips == ["10.80.1.0/24", "10.80.2.0/24"]
            assert group.dns_servers is None
            assert group.description == "updated group"

            assert user.name == "alice-renamed"
            assert user.allowed_ips_override is None
            assert user.description == "updated user"

            assert peer.name == "alice-laptop"
            assert peer.assigned_ip == "10.80.1.11"
            assert peer.description == "updated peer"
            assert peer.is_revealed is True
            assert peer.revealed_at is not None
            assert peer.private_key != original_private_key
            assert peer.public_key != original_public_key
            assert peer.preshared_key != original_preshared_key
            assert first_reveal.revealed_at < second_reveal.revealed_at
            assert first_reveal.config_text != second_reveal.config_text
            assert "alice-laptop" in second_reveal.config_text
            assert "Address = 10.80.1.11/32" in second_reveal.config_text
            assert f"PrivateKey = {peer.private_key}" in second_reveal.config_text
            assert f"PresharedKey = {peer.preshared_key}" in second_reveal.config_text
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address


def test_initial_settings_update_server_address_and_dns(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_endpoint = settings.server_endpoint
    previous_address = settings.server_address
    previous_dns = settings.server_dns

    settings.artifact_root = str(tmp_path)
    settings.server_endpoint = "vpn.test.local"
    settings.server_address = "10.99.0.1/24"
    settings.server_dns = ["1.1.1.1"]

    try:
        with SessionLocal() as session:
            initial = get_initial_settings(session)
            assert initial.endpoint_address == "vpn.test.local"
            assert initial.endpoint_port == 51820

            updated = update_initial_settings(
                session,
                InitialSettingsUpdate(
                    endpoint_address="vpn.updated.local",
                    endpoint_port=51821,
                    interface_mtu=1400,
                    server_address="10.99.0.2/24",
                    server_dns=["8.8.8.8", "8.8.4.4"],
                ),
            )

            assert updated.endpoint_address == "vpn.updated.local"
            assert updated.endpoint_port == 51821
            assert updated.interface_mtu == 1400
            assert updated.server_address == "10.99.0.2/24"
            assert updated.server_dns == ["8.8.8.8", "8.8.4.4"]

            server_state = get_server_state(session)
            assert server_state.server_address == "10.99.0.2/24"
            assert server_state.dns == ["8.8.8.8", "8.8.4.4"]
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address
        settings.server_dns = previous_dns


def test_peer_toggle_blocks_generation_when_inactive(tmp_path: Path) -> None:
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
                    name="corp-toggle",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.81.1.0/24",
                    default_allowed_ips=["10.81.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="bob"))
            peer = create_peer(session, PeerCreate(user_id=user.id, name="bob-pc"))

            peer = update_peer(session, peer.id, PeerUpdate(is_active=False))
            assert peer.is_active is False
            assert peer.revoked_at is not None

            try:
                generate_peer_artifacts(session, peer.id)
            except ValueError as exc:
                assert "inactive" in str(exc)
            else:
                raise AssertionError("expected peer artifact generation to fail")

            peer = update_peer(session, peer.id, PeerUpdate(is_active=True))
            assert peer.is_active is True
            assert peer.revoked_at is None
            artifacts = generate_peer_artifacts(session, peer.id)
            assert Path(artifacts.config_path).exists()
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address


def test_inactive_groups_users_are_skipped_in_server_config(tmp_path: Path) -> None:
    reset_db()
    previous_root = settings.artifact_root
    previous_address = settings.server_address
    settings.artifact_root = str(tmp_path)
    settings.server_address = "10.99.0.1/24"

    try:
        with SessionLocal() as session:
            active_group = create_group(
                session,
                GroupCreate(
                    name="corp-active",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.82.1.0/24",
                    default_allowed_ips=["10.82.1.0/24"],
                ),
            )
            inactive_group = create_group(
                session,
                GroupCreate(
                    name="corp-inactive",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.83.1.0/24",
                    default_allowed_ips=["10.83.1.0/24"],
                ),
            )
            active_user = create_user(
                session, UserCreate(group_id=active_group.id, name="carol")
            )
            inactive_user = create_user(
                session, UserCreate(group_id=inactive_group.id, name="dana")
            )
            active_peer = create_peer(
                session, PeerCreate(user_id=active_user.id, name="carol-pc")
            )
            inactive_peer = create_peer(
                session, PeerCreate(user_id=inactive_user.id, name="dana-pc")
            )

            update_group(session, inactive_group.id, GroupUpdate(is_active=False))
            update_user(session, inactive_user.id, UserUpdate(is_active=False))

            artifacts = generate_server_config(session)
            active_peer_public_key = active_peer.public_key
            inactive_peer_public_key = inactive_peer.public_key

            try:
                create_user(
                    session,
                    UserCreate(group_id=inactive_group.id, name="blocked"),
                )
            except ValueError as exc:
                assert "inactive" in str(exc)
            else:
                raise AssertionError("expected inactive group to block user creation")

        config_text = Path(artifacts.server_config_path).read_text(encoding="utf-8")
        assert "Name = carol-pc" in config_text
        assert "Name = dana-pc" not in config_text
        assert artifacts.peer_count == 1
        assert active_peer_public_key is not None
        assert inactive_peer_public_key is not None
    finally:
        settings.artifact_root = previous_root
        settings.server_address = previous_address
