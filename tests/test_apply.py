from pathlib import Path

from app.core import settings
from app.db import AuditBase, AuditSessionLocal, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope, OperationLog
from app.schemas import GroupCreate, PeerCreate, UserCreate
from app.services import apply_server_config, create_group, create_peer, create_user


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def create_apply_fixture() -> None:
    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-apply",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.70.1.0/24",
                default_allowed_ips=["10.70.1.0/24"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="apollo"))
        create_peer(session, PeerCreate(user_id=user.id, name="apollo-pc"))


def test_apply_server_config_bootstraps_with_wg_quick(
    monkeypatch, tmp_path: Path
) -> None:
    reset_db()

    previous_root = settings.artifact_root
    previous_address = settings.server_address
    previous_socket = settings.docker_socket_path
    previous_container = settings.wireguard_container_name
    previous_interface = settings.wireguard_interface_name

    fake_socket = tmp_path / "docker.sock"
    fake_socket.write_text("", encoding="utf-8")
    exec_calls: list[list[str]] = []
    exit_codes = iter([1, 0])

    def fake_run_exec(command: list[str]) -> int:
        exec_calls.append(command)
        return next(exit_codes)

    settings.artifact_root = str(tmp_path / "artifacts")
    settings.server_address = "10.99.0.1/24"
    settings.docker_socket_path = str(fake_socket)
    settings.wireguard_container_name = "wg-studio-wireguard"
    settings.wireguard_interface_name = "wg0"

    monkeypatch.setattr("app.services.apply._run_exec", fake_run_exec)

    try:
        create_apply_fixture()
        with SessionLocal() as session:
            result = apply_server_config(session)

        config_path = Path(result.server_config_path)
        assert config_path.exists()
        assert "apollo-pc" in config_path.read_text(encoding="utf-8")
        assert result.peer_count == 1
        assert result.container_name == "wg-studio-wireguard"
        assert result.interface_name == "wg0"
        assert exec_calls == [
            ["sh", "-lc", "ip link show wg0 >/dev/null 2>&1"],
            ["wg-quick", "up", "/config/wg_confs/wg0.conf"],
        ]

        with AuditSessionLocal() as audit_session:
            entries = list(
                audit_session.query(OperationLog)
                .filter(OperationLog.action == "server.apply_config")
                .all()
            )
        assert len(entries) == 1
        assert entries[0].details["peer_count"] == 1
    finally:
        settings.artifact_root = previous_root
        settings.server_address = previous_address
        settings.docker_socket_path = previous_socket
        settings.wireguard_container_name = previous_container
        settings.wireguard_interface_name = previous_interface


def test_apply_server_config_updates_existing_interface(
    monkeypatch, tmp_path: Path
) -> None:
    reset_db()

    previous_root = settings.artifact_root
    previous_address = settings.server_address
    previous_socket = settings.docker_socket_path
    previous_container = settings.wireguard_container_name
    previous_interface = settings.wireguard_interface_name

    fake_socket = tmp_path / "docker.sock"
    fake_socket.write_text("", encoding="utf-8")
    exec_calls: list[list[str]] = []
    exit_codes = iter([0, 0])

    def fake_run_exec(command: list[str]) -> int:
        exec_calls.append(command)
        return next(exit_codes)

    settings.artifact_root = str(tmp_path / "artifacts")
    settings.server_address = "10.99.0.1/24"
    settings.docker_socket_path = str(fake_socket)
    settings.wireguard_container_name = "wg-studio-wireguard"
    settings.wireguard_interface_name = "wg0"

    monkeypatch.setattr("app.services.apply._run_exec", fake_run_exec)

    try:
        create_apply_fixture()
        with SessionLocal() as session:
            result = apply_server_config(session)

        assert result.peer_count == 1
        assert exec_calls == [
            ["sh", "-lc", "ip link show wg0 >/dev/null 2>&1"],
            [
                "sh",
                "-lc",
                "wg-quick strip /config/wg_confs/wg0.conf | wg syncconf wg0 /dev/stdin",
            ],
        ]
    finally:
        settings.artifact_root = previous_root
        settings.server_address = previous_address
        settings.docker_socket_path = previous_socket
        settings.wireguard_container_name = previous_container
        settings.wireguard_interface_name = previous_interface
