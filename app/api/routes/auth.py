from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.schemas import (
    AuthChangePasswordRequest,
    AuthenticatedLoginUserRead,
    AuthLoginRequest,
    AuthLogoutRequest,
    AuthRefreshRequest,
    AuthSetupRequest,
    AuthSetupStatusRead,
    TokenPairRead,
)
from app.services import (
    authenticate_login,
    change_login_user_password,
    has_login_users,
    logout_login_session,
    refresh_login_tokens,
    setup_initial_login_user,
)

router = APIRouter()


@router.get("/auth/setup-status", response_model=AuthSetupStatusRead)
def auth_setup_status_endpoint(
    session: Session = Depends(get_session),
) -> AuthSetupStatusRead:
    return AuthSetupStatusRead(has_login_users=has_login_users(session))


@router.post("/auth/setup", response_model=TokenPairRead, status_code=201)
def auth_setup_endpoint(
    payload: AuthSetupRequest,
    session: Session = Depends(get_session),
) -> TokenPairRead:
    try:
        _, token_pair = setup_initial_login_user(session, payload.username, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return token_pair


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


@router.post("/auth/change-password", response_model=AuthenticatedLoginUserRead)
def change_password_endpoint(
    payload: AuthChangePasswordRequest,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> AuthenticatedLoginUserRead:
    try:
        updated_user = change_login_user_password(
            session,
            current_user,
            payload.current_password,
            payload.new_password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AuthenticatedLoginUserRead.model_validate(updated_user)
