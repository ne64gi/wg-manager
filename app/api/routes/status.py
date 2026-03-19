from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.schemas import PeerStatusRead, WireGuardOverviewRead
from app.services import get_wireguard_overview, get_wireguard_peer_statuses

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


@router.get("/status/peers", response_model=list[PeerStatusRead])
def get_wireguard_peer_statuses_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[PeerStatusRead]:
    try:
        return get_wireguard_peer_statuses(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
