from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.authz import authorize
from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.schemas.domain import (
    GroupAllocationUpdate,
    GroupCreate,
    GroupRead,
    GroupUpdate,
    InitialSettingsRead,
    InitialSettingsUpdate,
    PeerCreate,
    PeerRead,
    PeerResolvedAccess,
    PeerUpdate,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.schemas.state import StateExportRead, StateImportRequest, StateImportResultRead
from app.services import (
    create_group,
    create_peer,
    create_user,
    delete_group,
    delete_peer,
    delete_user,
    export_domain_state,
    get_group,
    get_peer,
    get_user,
    import_domain_state,
    list_groups,
    list_peers,
    list_users,
    reissue_peer_keys,
    revoke_peer,
    resolve_peer_access,
    update_group,
    update_group_allocation,
    update_peer,
    update_user,
)
from app.services.system import get_initial_settings, update_initial_settings

router = APIRouter()


@router.get("/health")
@authorize(action="system.health", public=True)
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/state/export", response_model=StateExportRead)
@authorize(action="state.export")
def export_state_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> StateExportRead:
    return export_domain_state(session)


@router.post("/state/import", response_model=StateImportResultRead)
@authorize(action="state.import")
def import_state_endpoint(
    payload: StateImportRequest,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> StateImportResultRead:
    try:
        return import_domain_state(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/groups", response_model=GroupRead, status_code=201)
@authorize(action="group.create", resource_type="group")
def create_group_endpoint(
    payload: GroupCreate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GroupRead:
    try:
        group = create_group(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return GroupRead.model_validate(group)


@router.patch("/groups/{group_id}", response_model=GroupRead)
@authorize(action="group.update", resource_type="group", resource_id_param="group_id")
def update_group_endpoint(
    group_id: int,
    payload: GroupUpdate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GroupRead:
    try:
        group = update_group(session, group_id, payload)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return GroupRead.model_validate(group)


@router.patch("/groups/{group_id}/allocation", response_model=GroupRead)
@authorize(action="group.update_allocation", resource_type="group", resource_id_param="group_id")
def update_group_allocation_endpoint(
    group_id: int,
    payload: GroupAllocationUpdate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GroupRead:
    try:
        group = update_group_allocation(session, group_id, payload)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return GroupRead.model_validate(group)


@router.get("/groups", response_model=list[GroupRead])
@authorize(action="group.list", resource_type="group")
def list_groups_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[GroupRead]:
    return [GroupRead.model_validate(group) for group in list_groups(session)]


@router.get("/groups/{group_id}", response_model=GroupRead)
@authorize(action="group.read", resource_type="group", resource_id_param="group_id")
def get_group_endpoint(
    group_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GroupRead:
    group = get_group(session, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="group not found")
    return GroupRead.model_validate(group)


@router.delete(
    "/groups/{group_id}",
    status_code=204,
    response_class=Response,
    response_model=None,
)
@authorize(action="group.delete", resource_type="group", resource_id_param="group_id")
def delete_group_endpoint(
    group_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
):
    try:
        delete_group(session, group_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)


@router.post("/users", response_model=UserRead, status_code=201)
@authorize(action="user.create", resource_type="user")
def create_user_endpoint(
    payload: UserCreate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> UserRead:
    try:
        user = create_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserRead.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserRead)
@authorize(action="user.update", resource_type="user", resource_id_param="user_id")
def update_user_endpoint(
    user_id: int,
    payload: UserUpdate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> UserRead:
    try:
        user = update_user(session, user_id, payload)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return UserRead.model_validate(user)


@router.get("/users", response_model=list[UserRead])
@authorize(action="user.list", resource_type="user")
def list_users_endpoint(
    group_id: int | None = Query(default=None),
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[UserRead]:
    return [
        UserRead.model_validate(user)
        for user in list_users(session, group_id=group_id)
    ]


@router.get("/users/{user_id}", response_model=UserRead)
@authorize(action="user.read", resource_type="user", resource_id_param="user_id")
def get_user_endpoint(
    user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> UserRead:
    user = get_user(session, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return UserRead.model_validate(user)


@router.delete(
    "/users/{user_id}",
    status_code=204,
    response_class=Response,
    response_model=None,
)
@authorize(action="user.delete", resource_type="user", resource_id_param="user_id")
def delete_user_endpoint(
    user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
):
    try:
        delete_user(session, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)


@router.post("/peers", response_model=PeerRead, status_code=201)
@authorize(action="peer.create", resource_type="peer")
def create_peer_endpoint(
    payload: PeerCreate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> PeerRead:
    try:
        peer = create_peer(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PeerRead.model_validate(peer)


@router.patch("/peers/{peer_id}", response_model=PeerRead)
@authorize(action="peer.update", resource_type="peer", resource_id_param="peer_id")
def update_peer_endpoint(
    peer_id: int,
    payload: PeerUpdate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> PeerRead:
    try:
        peer = update_peer(session, peer_id, payload)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return PeerRead.model_validate(peer)


@router.post("/peers/{peer_id}/reissue", response_model=PeerRead)
@authorize(action="peer.reissue", resource_type="peer", resource_id_param="peer_id")
def reissue_peer_keys_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> PeerRead:
    try:
        peer = reissue_peer_keys(session, peer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return PeerRead.model_validate(peer)


@router.get("/peers", response_model=list[PeerRead])
@authorize(action="peer.list", resource_type="peer")
def list_peers_endpoint(
    user_id: int | None = Query(default=None),
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[PeerRead]:
    return [
        PeerRead.model_validate(peer)
        for peer in list_peers(session, user_id=user_id)
    ]


@router.get("/peers/{peer_id}", response_model=PeerRead)
@authorize(action="peer.read", resource_type="peer", resource_id_param="peer_id")
def get_peer_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> PeerRead:
    peer = get_peer(session, peer_id)
    if peer is None:
        raise HTTPException(status_code=404, detail="peer not found")
    return PeerRead.model_validate(peer)


@router.post("/peers/{peer_id}/revoke", response_model=PeerRead)
@authorize(action="peer.revoke", resource_type="peer", resource_id_param="peer_id")
def revoke_peer_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> PeerRead:
    try:
        peer = revoke_peer(session, peer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return PeerRead.model_validate(peer)


@router.delete(
    "/peers/{peer_id}",
    status_code=204,
    response_class=Response,
    response_model=None,
)
@authorize(action="peer.delete", resource_type="peer", resource_id_param="peer_id")
def delete_peer_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
):
    try:
        delete_peer(session, peer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)


@router.get("/peers/{peer_id}/resolved-access", response_model=PeerResolvedAccess)
@authorize(action="peer.read_access", resource_type="peer", resource_id_param="peer_id")
def get_peer_resolved_access_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> PeerResolvedAccess:
    try:
        return resolve_peer_access(session, peer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/initial-settings", response_model=InitialSettingsRead)
@authorize(action="settings.read", resource_type="initial_settings")
def get_initial_settings_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> InitialSettingsRead:
    return InitialSettingsRead.model_validate(get_initial_settings(session))


@router.put("/initial-settings", response_model=InitialSettingsRead)
@authorize(action="settings.update", resource_type="initial_settings")
def update_initial_settings_endpoint(
    payload: InitialSettingsUpdate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> InitialSettingsRead:
    return InitialSettingsRead.model_validate(update_initial_settings(session, payload))
