from __future__ import annotations

from sqlalchemy import select

from app.db import AuditBase, AuditSessionLocal, SessionLocal, audit_engine
from app.models import GuiLog, GuiSettings, OperationLog

LOG_LEVEL_ORDER = {
    "debug": 10,
    "info": 20,
    "warning": 30,
    "error": 40,
    "critical": 50,
}


def init_log_db() -> None:
    AuditBase.metadata.create_all(bind=audit_engine)


def log_operation(
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    *,
    source: str = "system",
    details: dict | None = None,
) -> None:
    with AuditSessionLocal() as session:
        entry = OperationLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            source=source,
            details=details or {},
        )
        session.add(entry)
        session.commit()


def log_gui_event(
    level: str,
    category: str,
    message: str,
    *,
    login_user_id: int | None = None,
    username: str | None = None,
    request_path: str | None = None,
    request_method: str | None = None,
    status_code: int | None = None,
    details: dict | None = None,
) -> None:
    if category in {"auth", "settings", "secret"}:
        with AuditSessionLocal() as session:
            entry = GuiLog(
                level=level.lower(),
                category=category,
                message=message,
                login_user_id=login_user_id,
                username=username,
                request_path=request_path,
                request_method=request_method,
                status_code=status_code,
                details=details or {},
            )
            session.add(entry)
            session.commit()
        return

    with SessionLocal() as settings_session:
        gui_settings = settings_session.get(GuiSettings, 1)
        threshold = (gui_settings.error_log_level if gui_settings else "warning").lower()

    normalized_level = level.lower()
    if LOG_LEVEL_ORDER.get(normalized_level, 100) < LOG_LEVEL_ORDER.get(threshold, 30):
        return

    with AuditSessionLocal() as session:
        entry = GuiLog(
            level=normalized_level,
            category=category,
            message=message,
            login_user_id=login_user_id,
            username=username,
            request_path=request_path,
            request_method=request_method,
            status_code=status_code,
            details=details or {},
        )
        session.add(entry)
        session.commit()


def list_gui_logs(*, limit: int = 100) -> list[GuiLog]:
    with AuditSessionLocal() as session:
        return list(
            session.scalars(
                select(GuiLog).order_by(GuiLog.occurred_at.desc()).limit(limit)
            )
        )
