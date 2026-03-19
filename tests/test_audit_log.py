from app.audit import AuditBase, AuditSessionLocal, audit_engine
from app.audit_models import OperationLog
from app.database import Base, SessionLocal, engine
from app.models import GroupScope
from app.schemas import GroupAllocationUpdate, GroupCreate, PeerCreate, UserCreate
from app.services import create_group, create_peer, create_user, update_group_allocation


def reset_databases() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_audit_log_records_create_and_update_operations() -> None:
    reset_databases()

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-a",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.30.1.0/24",
                default_allowed_ips=["10.30.1.0/24"],
                allocation_start_host=2,
                reserved_ips=["10.30.1.1"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="alice"))
        peer = create_peer(session, PeerCreate(user_id=user.id, name="alice-pc"))
        peer_id = peer.id
        peer_ip = peer.assigned_ip
        update_group_allocation(
            session,
            group.id,
            GroupAllocationUpdate(
                allocation_start_host=3,
                reserved_ips=["10.30.1.1", "10.30.1.2"],
            ),
        )

    with AuditSessionLocal() as session:
        logs = list(session.query(OperationLog).order_by(OperationLog.id))

    assert [log.action for log in logs] == [
        "group.create",
        "user.create",
        "peer.create",
        "group.update_allocation",
    ]
    assert logs[0].entity_type == "group"
    assert logs[0].details["network_cidr"] == "10.30.1.0/24"
    assert logs[2].entity_id == peer_id
    assert logs[2].details["assigned_ip"] == peer_ip
