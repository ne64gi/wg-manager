from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import GroupScope, Peer, User
from app.schemas import GroupCreate, PeerCreate, UserCreate
from app.services import (
    create_group,
    create_peer,
    create_user,
    delete_group,
    delete_user,
    revoke_peer,
)


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_peer_revoke_sets_lifecycle_fields() -> None:
    reset_db()

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-l",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.40.1.0/24",
                default_allowed_ips=["10.40.1.0/24"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="luna"))
        peer = create_peer(session, PeerCreate(user_id=user.id, name="luna-pc"))
        created_at = peer.created_at
        revoked = revoke_peer(session, peer.id)

    assert revoked.is_active is False
    assert revoked.revoked_at is not None
    assert revoked.updated_at >= created_at


def test_delete_user_cascades_peers() -> None:
    reset_db()

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-u",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.41.1.0/24",
                default_allowed_ips=["10.41.1.0/24"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="uma"))
        peer = create_peer(session, PeerCreate(user_id=user.id, name="uma-pc"))
        delete_user(session, user.id)

        assert session.get(User, user.id) is None
        assert session.get(Peer, peer.id) is None


def test_delete_group_cascades_users_and_peers() -> None:
    reset_db()

    with SessionLocal() as session:
        group = create_group(
            session,
            GroupCreate(
                name="corp-g",
                scope=GroupScope.SINGLE_SITE,
                network_cidr="10.42.1.0/24",
                default_allowed_ips=["10.42.1.0/24"],
            ),
        )
        user = create_user(session, UserCreate(group_id=group.id, name="gale"))
        peer = create_peer(session, PeerCreate(user_id=user.id, name="gale-pc"))
        delete_group(session, group.id)

        assert session.get(User, user.id) is None
        assert session.get(Peer, peer.id) is None
