from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.runtime import RuntimeService, get_runtime_service
from app.schemas import ApplyResult
from app.services.audit import log_operation
from app.services.config_generation import generate_server_config
from app.services.domain import get_server_state


def apply_server_config(
    session: Session,
    runtime_service: RuntimeService | None = None,
) -> ApplyResult:
    runtime_service = runtime_service or get_runtime_service()
    artifacts = generate_server_config(session, runtime_service=runtime_service)
    server = get_server_state(session)
    runtime = runtime_service.apply_config()

    applied_at = datetime.now(timezone.utc)
    log_operation(
        "server.apply_config",
        "server",
        server.id,
        source="service",
        details={
            "config_path": artifacts.server_config_path,
            "peer_count": artifacts.peer_count,
            "container_name": runtime.container_name,
            "interface_name": runtime.interface_name,
            "applied_at": applied_at.isoformat(),
        },
    )

    return ApplyResult(
        server_config_path=artifacts.server_config_path,
        peer_count=artifacts.peer_count,
        container_name=runtime.container_name,
        interface_name=runtime.interface_name,
        applied_at=applied_at,
    )
