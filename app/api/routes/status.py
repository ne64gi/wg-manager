from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser, LoginUserRole
from app.schemas.status import (
    GroupTopologyNodeRead,
    GroupTrafficSummaryRead,
    PeerStatusRead,
    SyncStateRead,
    UserTrafficSummaryRead,
    WireGuardOverviewHistoryPointRead,
    WireGuardOverviewRead,
)
from app.services import (
    get_group_traffic_summaries,
    get_wireguard_topology,
    get_user_traffic_summaries,
    get_wireguard_overview,
    get_wireguard_overview_history,
    get_wireguard_peer_statuses,
    get_wireguard_sync_state,
)

router = APIRouter()


def _scoped_group_id(current_user: LoginUser) -> int | None:
    if current_user.role == LoginUserRole.GROUP_ADMIN:
        return current_user.group_id
    return None


@router.get("/status/overview", response_model=WireGuardOverviewRead)
def get_wireguard_overview_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> WireGuardOverviewRead:
    try:
        return get_wireguard_overview(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status/sync-state", response_model=SyncStateRead)
def get_wireguard_sync_state_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> SyncStateRead:
    try:
        return get_wireguard_sync_state(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get(
    "/status/overview-history",
    response_model=list[WireGuardOverviewHistoryPointRead],
)
def get_wireguard_overview_history_endpoint(
    hours: int = Query(default=24, ge=1, le=168),
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[WireGuardOverviewHistoryPointRead]:
    try:
        return get_wireguard_overview_history(session, hours=hours)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status/peers", response_model=list[PeerStatusRead])
def get_wireguard_peer_statuses_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[PeerStatusRead]:
    try:
        return get_wireguard_peer_statuses(
            session, group_id=_scoped_group_id(current_user)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status/users-summary", response_model=list[UserTrafficSummaryRead])
def get_user_traffic_summaries_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[UserTrafficSummaryRead]:
    try:
        return get_user_traffic_summaries(
            session, group_id=_scoped_group_id(current_user)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status/groups-summary", response_model=list[GroupTrafficSummaryRead])
def get_group_traffic_summaries_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[GroupTrafficSummaryRead]:
    try:
        return get_group_traffic_summaries(
            session, group_id=_scoped_group_id(current_user)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status/topology", response_model=list[GroupTopologyNodeRead])
def get_wireguard_topology_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[GroupTopologyNodeRead]:
    try:
        return get_wireguard_topology(
            session, group_id=_scoped_group_id(current_user)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
