from datetime import datetime, timedelta, timezone

from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope
from app.schemas import GroupCreate, PeerCreate, UserCreate
from app.services import (
    create_group,
    create_peer,
    create_user,
    get_wireguard_overview,
    get_wireguard_peer_statuses,
)
from app.services.docker_runtime import ExecResult


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_get_wireguard_peer_statuses_and_overview(monkeypatch) -> None:
    reset_db()

    now = int(datetime.now(timezone.utc).timestamp())
    dump_output = (
        "private\tpublic\t51820\tfwmark\n"
        f"pub-online\t(psk)\t198.51.100.10:51820\t10.10.1.1/32\t{now}\t1024\t2048\t25\n"
        "pub-offline\t(psk)\t(none)\t10.10.1.2/32\t0\t0\t0\toff\n"
    )

    def fake_docker_exec(command: list[str], *, capture_output: bool = False) -> ExecResult:
        assert command == ["wg", "show", "wg0", "dump"]
        assert capture_output is True
        return ExecResult(exit_code=0, stdout=dump_output, stderr="")

    monkeypatch.setattr("app.services.status.docker_exec", fake_docker_exec)

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-status",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.10.1.0/24",
                default_allowed_ips=["10.10.1.0/24"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="alpha"))
        peer_online = create_peer(
            session,
            PeerCreate(user_id=user.id, name="alpha-pc", assigned_ip="10.10.1.1"),
        )
        peer_offline = create_peer(
            session,
            PeerCreate(user_id=user.id, name="alpha-phone", assigned_ip="10.10.1.2"),
        )
        peer_online.public_key = "pub-online"
        peer_offline.public_key = "pub-offline"
        session.commit()

        statuses = get_wireguard_peer_statuses(session)
        overview = get_wireguard_overview(session)

    assert len(statuses) == 2
    online = next(status for status in statuses if status.peer_name == "alpha-pc")
    offline = next(status for status in statuses if status.peer_name == "alpha-phone")

    assert online.is_online is True
    assert online.endpoint == "198.51.100.10:51820"
    assert online.received_bytes == 1024
    assert online.sent_bytes == 2048
    assert online.total_bytes == 3072
    assert online.latest_handshake_at is not None
    assert online.latest_handshake_at >= datetime.now(timezone.utc) - timedelta(minutes=2)

    assert offline.is_online is False
    assert offline.endpoint is None
    assert offline.total_bytes == 0

    assert overview.peer_count == 2
    assert overview.active_peer_count == 2
    assert overview.online_peer_count == 1
    assert overview.total_received_bytes == 1024
    assert overview.total_sent_bytes == 2048
    assert overview.total_usage_bytes == 3072
