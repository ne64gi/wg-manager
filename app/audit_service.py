from __future__ import annotations

from app.audit import AuditBase, AuditSessionLocal, audit_engine
from app.audit_models import OperationLog


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
