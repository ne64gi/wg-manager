from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.core import get_system_version, settings
from app.schemas import (
    GuiLogListRead,
    GuiLogRead,
    GuiSettingsRead,
    GuiSettingsUpdate,
    LoginUserCreate,
    LoginUserRead,
    LoginUserUpdate,
    SystemVersionRead,
)
from app.services import (
    create_login_user,
    delete_login_user,
    get_gui_settings,
    get_login_user,
    list_gui_logs,
    list_gui_logs_page,
    list_login_users,
    update_gui_settings,
    update_login_user,
)

router = APIRouter()


@router.get("/gui/version", response_model=SystemVersionRead)
def get_system_version_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
) -> SystemVersionRead:
    version = get_system_version()
    return SystemVersionRead(
        version=version,
        frontend_version=version,
        runtime_adapter=settings.runtime_adapter,
    )


@router.get("/gui/settings", response_model=GuiSettingsRead)
def get_gui_settings_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GuiSettingsRead:
    return GuiSettingsRead.model_validate(get_gui_settings(session))


@router.put("/gui/settings", response_model=GuiSettingsRead)
def update_gui_settings_endpoint(
    payload: GuiSettingsUpdate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GuiSettingsRead:
    return GuiSettingsRead.model_validate(update_gui_settings(session, payload))


@router.get("/gui/login-users", response_model=list[LoginUserRead])
def list_login_users_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[LoginUserRead]:
    return [
        LoginUserRead.model_validate(login_user)
        for login_user in list_login_users(session)
    ]


@router.post("/gui/login-users", response_model=LoginUserRead, status_code=201)
def create_login_user_endpoint(
    payload: LoginUserCreate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> LoginUserRead:
    try:
        login_user = create_login_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return LoginUserRead.model_validate(login_user)


@router.get("/gui/login-users/{login_user_id}", response_model=LoginUserRead)
def get_login_user_endpoint(
    login_user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> LoginUserRead:
    login_user = get_login_user(session, login_user_id)
    if login_user is None:
        raise HTTPException(status_code=404, detail="login user not found")
    return LoginUserRead.model_validate(login_user)


@router.patch("/gui/login-users/{login_user_id}", response_model=LoginUserRead)
def update_login_user_endpoint(
    login_user_id: int,
    payload: LoginUserUpdate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> LoginUserRead:
    try:
        login_user = update_login_user(session, login_user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return LoginUserRead.model_validate(login_user)


@router.delete(
    "/gui/login-users/{login_user_id}",
    status_code=204,
    response_class=Response,
    response_model=None,
)
def delete_login_user_endpoint(
    login_user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
):
    try:
        delete_login_user(session, login_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)


@router.get("/gui/logs", response_model=GuiLogListRead)
def list_gui_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    level: str | None = Query(default=None),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    current_user: LoginUser = Depends(require_authenticated_login_user),
) -> GuiLogListRead:
    entries, total = list_gui_logs_page(
        limit=limit,
        offset=offset,
        level=level,
        category=category,
        search=search,
    )
    return GuiLogListRead(
        items=[GuiLogRead.model_validate(entry) for entry in entries],
        total=total,
        limit=limit,
        offset=offset,
    )
