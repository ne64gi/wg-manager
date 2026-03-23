from pathlib import Path

from sqlalchemy import inspect

from app.core import settings
from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope
from app.schemas import (
    GroupCreate,
    GuiSettingsUpdate,
    LoginUserCreate,
    LoginUserUpdate,
    PeerCreate,
    UserCreate,
)
from app.services import (
    bootstrap_login_user,
    create_group,
    create_login_user,
    create_peer,
    create_user,
    delete_login_user,
    get_gui_settings,
    list_gui_logs,
    list_login_users,
    reveal_peer_artifacts,
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

        delete_login_user(session, login_user.id)
        assert list_login_users(session) == []

    gui_logs = list_gui_logs(limit=20)
    messages = [entry.message for entry in gui_logs]
    assert "GUI login user created" in messages
    assert "GUI settings updated" in messages
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
