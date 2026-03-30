from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import inspect

from app.core import settings
from app.api.routes.gui import get_system_version_endpoint
from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope
from app.schemas import (
    GroupCreate,
    GuiSettingsUpdate,
    InitialSettingsUpdate,
    LoginUserCreate,
    LoginUserUpdate,
    PeerCreate,
    UserCreate,
)
from app.services import (
    bootstrap_login_user,
    build_login_user_read,
    create_group,
    create_login_user,
    create_peer,
    create_user,
    delete_login_user,
    get_gui_settings,
    get_initial_settings,
    list_gui_logs,
    list_login_users,
    reveal_peer_artifacts,
    update_initial_settings,
    update_gui_settings,
    update_login_user,
    init_db,
)
from app.services.gui import verify_password


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_reveal_peer_artifacts_is_one_time(tmp_path: Path) -> None:
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
                    name="corp-reveal",
                    scope=GroupScope.SINGLE_SITE,
                    network_cidr="10.70.1.0/24",
                    default_allowed_ips=["10.70.1.0/24"],
                ),
            )
            user = create_user(session, UserCreate(group_id=group.id, name="alpha"))
            peer = create_peer(session, PeerCreate(user_id=user.id, name="alpha-pc"))

            revealed = reveal_peer_artifacts(session, peer.id)
            session.refresh(peer)

            assert "Address = 10.70.1.1/32" in revealed.config_text
            assert "<svg" in revealed.qr_svg
            assert peer.is_revealed is True
            assert peer.revealed_at is not None

            try:
                reveal_peer_artifacts(session, peer.id)
            except ValueError as exc:
                assert "already been revealed" in str(exc)
            else:
                raise AssertionError("expected reveal to fail on second attempt")
    finally:
        settings.artifact_root = previous_root
        settings.server_endpoint = previous_endpoint
        settings.server_address = previous_address


def test_login_users_and_gui_settings_are_persisted() -> None:
    reset_db()

    with SessionLocal() as session:
        login_user = create_login_user(
            session,
            LoginUserCreate(
                username="admin",
                password="supersecret",
                description="main admin",
                preferred_locale="ja",
            ),
        )
        assert verify_password("supersecret", login_user.password_hash) is True

        updated_login_user = update_login_user(
            session,
            login_user.id,
            LoginUserUpdate(password="newsecret123", is_active=False),
        )
        assert updated_login_user.is_active is False
        assert verify_password("newsecret123", updated_login_user.password_hash) is True

        gui_settings = get_gui_settings(session)
        assert gui_settings.theme_mode == "system"
        assert gui_settings.default_locale == "en"
        assert gui_settings.overview_refresh_seconds == 5
        assert gui_settings.peers_refresh_seconds == 10
        assert gui_settings.refresh_after_apply is True
        assert gui_settings.online_threshold_seconds == 120
        assert gui_settings.error_log_level == "warning"
        assert gui_settings.access_log_path == "none"
        assert gui_settings.error_log_path == "none"

        gui_settings = update_gui_settings(
            session,
            GuiSettingsUpdate(
                theme_mode="dark",
                default_locale="ja",
                overview_refresh_seconds=7,
                peers_refresh_seconds=15,
                refresh_after_apply=False,
                online_threshold_seconds=90,
                error_log_level="error",
                access_log_path="/var/log/wg-studio/access.log",
                error_log_path="none",
            ),
        )
        assert gui_settings.theme_mode == "dark"
        assert gui_settings.default_locale == "ja"
        assert gui_settings.overview_refresh_seconds == 7
        assert gui_settings.peers_refresh_seconds == 15
        assert gui_settings.refresh_after_apply is False
        assert gui_settings.online_threshold_seconds == 90
        assert gui_settings.error_log_level == "error"
        assert gui_settings.access_log_path == "/var/log/wg-studio/access.log"

        users = list_login_users(session)
        assert [user.username for user in users] == ["admin"]

        projected = build_login_user_read(session, updated_login_user)
        assert projected.group_id is None
        assert projected.email is None
        assert projected.role == "admin"
        assert projected.preferred_theme_mode == "system"
        assert projected.locale == "ja"
        assert projected.timezone == "UTC"
        assert projected.avatar_url is None

        delete_login_user(session, login_user.id)
        assert list_login_users(session) == []

    gui_logs = list_gui_logs(limit=20)
    messages = [entry.message for entry in gui_logs]
    assert "GUI login user created" not in messages
    assert "GUI settings updated" not in messages
    assert "GUI login user deleted" not in messages


def test_initial_settings_include_interface_mtu() -> None:
    reset_db()

    with SessionLocal() as session:
        initial_settings = get_initial_settings(session)
        assert initial_settings.interface_mtu is None

        updated = update_initial_settings(
            session,
            InitialSettingsUpdate(
                endpoint_address="vpn.example.test",
                endpoint_port=51820,
                interface_mtu=1380,
            ),
        )
        assert updated.interface_mtu == 1380


def test_gui_log_threshold_filters_info_entries() -> None:
    reset_db()

    with SessionLocal() as session:
        update_gui_settings(
            session,
            GuiSettingsUpdate(
                theme_mode="system",
                default_locale="en",
                overview_refresh_seconds=5,
                peers_refresh_seconds=10,
                traffic_snapshot_interval_seconds=300,
                refresh_after_apply=True,
                online_threshold_seconds=120,
                error_log_level="warning",
                access_log_path="none",
                error_log_path="none",
            ),
        )
        create_login_user(
            session,
            LoginUserCreate(
                username="audited-admin",
                password="supersecret123",
            ),
        )

    gui_logs = list_gui_logs(limit=20)
    messages = [entry.message for entry in gui_logs]
    assert "GUI login user created" not in messages
    assert "GUI settings updated" not in messages


def test_gui_log_threshold_keeps_warning_entries() -> None:
    reset_db()

    with SessionLocal() as session:
        update_gui_settings(
            session,
            GuiSettingsUpdate(
                theme_mode="system",
                default_locale="en",
                overview_refresh_seconds=5,
                peers_refresh_seconds=10,
                traffic_snapshot_interval_seconds=300,
                refresh_after_apply=True,
                online_threshold_seconds=120,
                error_log_level="warning",
                access_log_path="none",
                error_log_path="none",
            ),
        )
        login_user = create_login_user(
            session,
            LoginUserCreate(
                username="warning-admin",
                password="supersecret123",
            ),
        )
        delete_login_user(session, login_user.id)

    gui_logs = list_gui_logs(limit=20)
    messages = [entry.message for entry in gui_logs]
    assert "GUI login user created" not in messages
    assert "GUI login user deleted" in messages


def test_bootstrap_login_user_from_env(monkeypatch) -> None:
    reset_db()
    monkeypatch.setattr(settings, "bootstrap_admin_username", "bootstrap-admin")
    monkeypatch.setattr(settings, "bootstrap_admin_password", "bootstrap-secret")

    with SessionLocal() as session:
        login_user = bootstrap_login_user(session)
        assert login_user is not None
        assert login_user.username == "bootstrap-admin"
        assert verify_password("bootstrap-secret", login_user.password_hash) is True

        second = bootstrap_login_user(session)
        assert second is not None
        assert second.id == login_user.id


def test_init_db_registers_login_user_tables() -> None:
    Base.metadata.drop_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)

    init_db()

    inspector = inspect(engine)
    assert "login_users" in inspector.get_table_names()
    assert "login_sessions" in inspector.get_table_names()
    assert "gui_settings" in inspector.get_table_names()
    assert "initial_settings" in inspector.get_table_names()
    initial_columns = {column["name"] for column in inspector.get_columns("initial_settings")}
    assert "interface_mtu" in initial_columns


def test_gui_version_payload_includes_runtime_adapter(monkeypatch) -> None:
    monkeypatch.setattr("app.api.routes.gui.get_system_version", lambda: "1.1.5-test")
    monkeypatch.setattr(settings, "runtime_adapter", "docker_container")
    class RuntimeDescriptor:
        interface_name = "wg0"
        container_name = "wg-studio-wireguard"
        image_name = "wg-studio-wireguard"
        status = "running"
        is_running = True
        started_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        uptime_seconds = 3600
        restart_count = 0

    class FakeRuntimeService:
        def describe(self):
            return RuntimeDescriptor()

    class ServerState:
        updated_at = datetime(2026, 1, 2, tzinfo=timezone.utc)

    monkeypatch.setattr("app.api.routes.gui.get_runtime_service", lambda: FakeRuntimeService())
    monkeypatch.setattr("app.api.routes.gui.get_server_state", lambda session: ServerState())

    payload = get_system_version_endpoint(current_user=None, session=None)  # type: ignore[arg-type]

    assert payload.version == "1.1.5-test"
    assert payload.frontend_version == "1.1.5-test"
    assert payload.runtime_adapter == "docker_container"
    assert payload.interface_name == "wg0"
    assert payload.runtime_container_name == "wg-studio-wireguard"
    assert payload.runtime_status == "running"
    assert payload.runtime_uptime_seconds == 3600
