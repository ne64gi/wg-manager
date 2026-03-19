import ipaddress

from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope
from app.schemas import GroupCreate, PeerCreate, UserCreate
from app.services import (
    _validate_group_allocation_settings,
    create_group,
    create_peer,
    create_user,
)


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_group_allocation_validation_handles_large_network_without_iteration() -> None:
    _validate_group_allocation_settings(
        "10.0.0.0/8",
        16_777_214,
        ["10.0.0.1"],
    )


def test_auto_assignment_uses_start_offset_and_skips_reserved_and_used_ips() -> None:
    reset_db()

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-a",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.10.1.0/24",
                default_allowed_ips=["10.10.1.0/24"],
                allocation_start_host=2,
                reserved_ips=["10.10.1.2", "10.10.1.4"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="alice"))
        create_peer(
            session,
            PeerCreate(user_id=user.id, name="alice-pc", assigned_ip="10.10.1.3"),
        )

        peer = create_peer(
            session,
            PeerCreate(user_id=user.id, name="alice-phone"),
        )

    assert peer.assigned_ip == "10.10.1.5"


def test_auto_assignment_respects_large_start_host_on_slash_8() -> None:
    reset_db()

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="admins",
                scope=GroupScope.ADMIN,
                network_cidr="10.0.0.0/8",
                default_allowed_ips=["10.0.0.0/8"],
                allocation_start_host=1_000_000,
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="root"))
        peer = create_peer(session, PeerCreate(user_id=user.id, name="root-pc"))

    expected = str(ipaddress.ip_address(int(ipaddress.ip_address("10.0.0.0")) + 1_000_000))
    assert peer.assigned_ip == expected


def test_manual_assignment_rejects_reserved_network_and_broadcast_ips() -> None:
    reset_db()

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-b",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.20.1.0/24",
                default_allowed_ips=["10.20.1.0/24"],
                reserved_ips=["10.20.1.10"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="bob"))

        for candidate, message in [
            ("10.20.1.0", "not a usable host"),
            ("10.20.1.255", "not a usable host"),
            ("10.20.1.10", "is reserved"),
        ]:
            try:
                create_peer(
                    session,
                    PeerCreate(user_id=user.id, name=f"peer-{candidate}", assigned_ip=candidate),
                )
            except ValueError as exc:
                assert message in str(exc)
            else:
                raise AssertionError(f"expected ValueError for {candidate}")
