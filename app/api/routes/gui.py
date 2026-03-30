from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.authz import authorize
from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.core import get_system_version, settings
from app.runtime import get_runtime_service
from app.schemas.gui import (
    AuditLogListRead,
    AuditLogRead,
    GuiLogListRead,
    GuiLogRead,
    GuiSettingsRead,
    GuiSettingsUpdate,
    LoginUserCreate,
    LoginUserRead,
    LoginUserUpdate,
    OperationLogListRead,
    OperationLogRead,
    SystemVersionRead,
)
from app.services import (
    build_login_user_read,
    create_login_user,
    delete_login_user,
    get_gui_settings,
    get_login_user,
    get_server_state,
    log_audit_event,
    list_audit_logs_page,
    list_gui_logs,
    list_gui_logs_page,
    list_login_users,
    list_operation_logs_page,
    update_gui_settings,
    update_login_user,
)

router = APIRouter()


@router.get("/gui/version", response_model=SystemVersionRead)
def get_system_version_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> SystemVersionRead:
    version = get_system_version()
    runtime = get_runtime_service().describe()
    server_state = get_server_state(session)
    return SystemVersionRead(
        version=version,
        frontend_version=version,
        runtime_adapter=settings.runtime_adapter,
        interface_name=runtime.interface_name,
        runtime_container_name=runtime.container_name,
        runtime_image_name=runtime.image_name,
        runtime_status=runtime.status,
        runtime_running=runtime.is_running,
        runtime_started_at=runtime.started_at,
        runtime_uptime_seconds=runtime.uptime_seconds,
        runtime_restart_count=runtime.restart_count,
        last_server_state_change_at=server_state.updated_at,
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
    settings_read = GuiSettingsRead.model_validate(update_gui_settings(session, payload))
    log_audit_event(
        "settings.update",
        "settings",
        login_user_id=current_user.id,
        username=current_user.username,
        target_entity_type="gui_settings",
        target_entity_id=settings_read.id,
        request_path="/gui/settings",
        request_method="PUT",
        status_code=200,
    )
    return settings_read


@router.get("/gui/login-users", response_model=list[LoginUserRead])
@authorize(action="login_user.list", resource_type="login_user")
def list_login_users_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> list[LoginUserRead]:
    return [build_login_user_read(session, login_user) for login_user in list_login_users(session)]


@router.post("/gui/login-users", response_model=LoginUserRead, status_code=201)
@authorize(action="login_user.create", resource_type="login_user")
def create_login_user_endpoint(
    payload: LoginUserCreate,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> LoginUserRead:
    try:
        login_user = create_login_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    log_audit_event(
        "login_user.create",
        "login_user",
        login_user_id=current_user.id,
        username=current_user.username,
        target_entity_type="login_user",
        target_entity_id=login_user.id,
        request_path="/gui/login-users",
        request_method="POST",
        status_code=201,
        details={"target_username": login_user.username},
    )
    return build_login_user_read(session, login_user)


@router.get("/gui/login-users/{login_user_id}", response_model=LoginUserRead)
@authorize(action="login_user.read", resource_type="login_user", resource_id_param="login_user_id")
def get_login_user_endpoint(
    login_user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> LoginUserRead:
    login_user = get_login_user(session, login_user_id)
    if login_user is None:
        raise HTTPException(status_code=404, detail="login user not found")
    return build_login_user_read(session, login_user)


@router.patch("/gui/login-users/{login_user_id}", response_model=LoginUserRead)
@authorize(action="login_user.update", resource_type="login_user", resource_id_param="login_user_id")
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
    log_audit_event(
        "login_user.update",
        "login_user",
        login_user_id=current_user.id,
        username=current_user.username,
        target_entity_type="login_user",
        target_entity_id=login_user.id,
        request_path=f"/gui/login-users/{login_user_id}",
        request_method="PATCH",
        status_code=200,
        details={"target_username": login_user.username},
    )
    return build_login_user_read(session, login_user)


@router.delete(
    "/gui/login-users/{login_user_id}",
    status_code=204,
    response_class=Response,
    response_model=None,
)
@authorize(action="login_user.delete", resource_type="login_user", resource_id_param="login_user_id")
def delete_login_user_endpoint(
    login_user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
):
    target_login_user = get_login_user(session, login_user_id)
    target_username = target_login_user.username if target_login_user is not None else None
    try:
        delete_login_user(session, login_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    log_audit_event(
        "login_user.delete",
        "login_user",
        login_user_id=current_user.id,
        username=current_user.username,
        target_entity_type="login_user",
        target_entity_id=login_user_id,
        request_path=f"/gui/login-users/{login_user_id}",
        request_method="DELETE",
        status_code=204,
        details={"target_username": target_username},
    )
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


@router.get("/gui/operation-logs", response_model=OperationLogListRead)
def list_operation_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    current_user: LoginUser = Depends(require_authenticated_login_user),
) -> OperationLogListRead:
    entries, total = list_operation_logs_page(
        limit=limit,
        offset=offset,
        action=action,
        entity_type=entity_type,
        search=search,
    )
    return OperationLogListRead(
        items=[OperationLogRead.model_validate(entry) for entry in entries],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/gui/audit-logs", response_model=AuditLogListRead)
def list_audit_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    category: str | None = Query(default=None),
    outcome: str | None = Query(default=None),
    search: str | None = Query(default=None),
    current_user: LoginUser = Depends(require_authenticated_login_user),
) -> AuditLogListRead:
    entries, total = list_audit_logs_page(
        limit=limit,
        offset=offset,
        category=category,
        outcome=outcome,
        search=search,
    )
    return AuditLogListRead(
        items=[AuditLogRead.model_validate(entry) for entry in entries],
        total=total,
        limit=limit,
        offset=offset,
    )
