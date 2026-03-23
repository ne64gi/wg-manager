from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.runtime import get_wireguard_runtime
from app.schemas import ApplyResult
from app.services.audit import log_operation
from app.services.config_generation import generate_server_config
from app.services.domain import get_server_state


def _run_wireguard_apply() -> None:
    runtime = get_wireguard_runtime()
    runtime.apply_config()


def apply_server_config(session: Session) -> ApplyResult:
    artifacts = generate_server_config(session)
    server = get_server_state(session)
    runtime = get_wireguard_runtime()
    _run_wireguard_apply()

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
