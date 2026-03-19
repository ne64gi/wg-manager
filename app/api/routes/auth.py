from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.schemas import (
    AuthenticatedLoginUserRead,
    AuthLoginRequest,
    AuthLogoutRequest,
    AuthRefreshRequest,
    TokenPairRead,
)
from app.services import authenticate_login, logout_login_session, refresh_login_tokens

router = APIRouter()


@router.post("/auth/login", response_model=TokenPairRead)
def login_endpoint(
    payload: AuthLoginRequest,
    session: Session = Depends(get_session),
) -> TokenPairRead:
    try:
        _, token_pair = authenticate_login(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return token_pair


@router.post("/auth/refresh", response_model=TokenPairRead)
def refresh_endpoint(
    payload: AuthRefreshRequest,
    session: Session = Depends(get_session),
) -> TokenPairRead:
    try:
        _, token_pair = refresh_login_tokens(session, payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return token_pair


@router.post("/auth/logout", status_code=204)
def logout_endpoint(
    payload: AuthLogoutRequest,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
):
    try:
        logout_login_session(session, payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return None


@router.get("/auth/me", response_model=AuthenticatedLoginUserRead)
def auth_me_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
) -> AuthenticatedLoginUserRead:
    return AuthenticatedLoginUserRead.model_validate(current_user)
