from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_session
from app.schemas import (
    GroupAllocationUpdate,
    GroupCreate,
    GroupRead,
    PeerCreate,
    PeerRead,
    PeerResolvedAccess,
    UserCreate,
    UserRead,
)
from app.services import (
    create_group,
    create_peer,
    create_user,
    get_group,
    get_peer,
    get_user,
    init_db,
    list_groups,
    list_peers,
    list_users,
    resolve_peer_access,
    update_group_allocation,
)

app = FastAPI(title="WireGuard Control Plane", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/groups", response_model=GroupRead, status_code=201)
def create_group_endpoint(
    payload: GroupCreate, session: Session = Depends(get_session)
) -> GroupRead:
    try:
        group = create_group(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return GroupRead.model_validate(group)


@app.patch("/groups/{group_id}/allocation", response_model=GroupRead)
def update_group_allocation_endpoint(
    group_id: int,
    payload: GroupAllocationUpdate,
    session: Session = Depends(get_session),
) -> GroupRead:
    try:
        group = update_group_allocation(session, group_id, payload)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return GroupRead.model_validate(group)


@app.get("/groups", response_model=list[GroupRead])
def list_groups_endpoint(session: Session = Depends(get_session)) -> list[GroupRead]:
    return [GroupRead.model_validate(group) for group in list_groups(session)]


@app.get("/groups/{group_id}", response_model=GroupRead)
def get_group_endpoint(
    group_id: int, session: Session = Depends(get_session)
) -> GroupRead:
    group = get_group(session, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="group not found")
    return GroupRead.model_validate(group)


@app.post("/users", response_model=UserRead, status_code=201)
def create_user_endpoint(
    payload: UserCreate, session: Session = Depends(get_session)
) -> UserRead:
    try:
        user = create_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserRead.model_validate(user)


@app.get("/users", response_model=list[UserRead])
def list_users_endpoint(
    group_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[UserRead]:
    return [
        UserRead.model_validate(user)
        for user in list_users(session, group_id=group_id)
    ]


@app.get("/users/{user_id}", response_model=UserRead)
def get_user_endpoint(user_id: int, session: Session = Depends(get_session)) -> UserRead:
    user = get_user(session, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return UserRead.model_validate(user)


@app.post("/peers", response_model=PeerRead, status_code=201)
def create_peer_endpoint(
    payload: PeerCreate, session: Session = Depends(get_session)
) -> PeerRead:
    try:
        peer = create_peer(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PeerRead.model_validate(peer)


@app.get("/peers", response_model=list[PeerRead])
def list_peers_endpoint(
    user_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[PeerRead]:
    return [
        PeerRead.model_validate(peer)
        for peer in list_peers(session, user_id=user_id)
    ]


@app.get("/peers/{peer_id}", response_model=PeerRead)
def get_peer_endpoint(peer_id: int, session: Session = Depends(get_session)) -> PeerRead:
    peer = get_peer(session, peer_id)
    if peer is None:
        raise HTTPException(status_code=404, detail="peer not found")
    return PeerRead.model_validate(peer)


@app.get("/peers/{peer_id}/resolved-access", response_model=PeerResolvedAccess)
def get_peer_resolved_access_endpoint(
    peer_id: int, session: Session = Depends(get_session)
) -> PeerResolvedAccess:
    try:
        return resolve_peer_access(session, peer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
