from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.schemas import (
    GroupTrafficSummaryRead,
    PeerStatusRead,
    UserTrafficSummaryRead,
    WireGuardOverviewHistoryPointRead,
    WireGuardOverviewRead,
)
from app.services import (
    get_group_traffic_summaries,
    get_user_traffic_summaries,
    get_wireguard_overview,
    get_wireguard_overview_history,
    get_wireguard_peer_statuses,
)

router = APIRouter()


@router.get("/status/overview", response_model=WireGuardOverviewRead)
def get_wireguard_overview_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> WireGuardOverviewRead:
    try:
        return get_wireguard_overview(session)
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
        return get_wireguard_peer_statuses(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status/users-summary", response_model=list[UserTrafficSummaryRead])
def get_user_traffic_summaries_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[UserTrafficSummaryRead]:
    try:
        return get_user_traffic_summaries(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status/groups-summary", response_model=list[GroupTrafficSummaryRead])
def get_group_traffic_summaries_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[GroupTrafficSummaryRead]:
    try:
        return get_group_traffic_summaries(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
