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


def test_apply_server_config_generates_and_syncs(monkeypatch, tmp_path: Path) -> None:
    reset_db()

    previous_root = settings.artifact_root
    previous_address = settings.server_address
    previous_socket = settings.docker_socket_path
    previous_container = settings.wireguard_container_name
    previous_interface = settings.wireguard_interface_name

    fake_socket = tmp_path / "docker.sock"
    fake_socket.write_text("", encoding="utf-8")
    docker_calls: list[tuple[str, str, dict | None]] = []

    def fake_docker_request(method: str, path: str, *, body: dict | None = None):
        docker_calls.append((method, path, body))
        if path.endswith("/exec") and method == "POST":
            return {"Id": "exec-123"}
        if path.endswith("/start") and method == "POST":
            return None
        if path.endswith("/json") and method == "GET":
            return {"Running": False, "ExitCode": 0}
        raise AssertionError(f"unexpected docker request: {method} {path}")

    settings.artifact_root = str(tmp_path / "artifacts")
    settings.server_address = "10.99.0.1/24"
    settings.docker_socket_path = str(fake_socket)
    settings.wireguard_container_name = "wg-studio-wireguard"
    settings.wireguard_interface_name = "wg0"

    monkeypatch.setattr("app.services.apply._docker_request", fake_docker_request)

    try:
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

            result = apply_server_config(session)

        config_path = Path(result.server_config_path)
        assert config_path.exists()
        assert "apollo-pc" in config_path.read_text(encoding="utf-8")
        assert result.peer_count == 1
        assert result.container_name == "wg-studio-wireguard"
        assert result.interface_name == "wg0"
        assert len(docker_calls) == 3
        assert docker_calls[0][1].endswith("/containers/wg-studio-wireguard/exec")

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
