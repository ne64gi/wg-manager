from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core import settings
from app.schemas import ApplyResult
from app.services.audit import log_operation
from app.services.config_generation import generate_server_config
from app.services.docker_runtime import ExecResult, docker_exec, ensure_docker_socket_available
from app.services.domain import get_server_state


def _run_exec(command: list[str], *, capture_output: bool = False) -> ExecResult:
    return docker_exec(command, capture_output=capture_output)


def _coerce_exec_result(result: int | ExecResult) -> ExecResult:
    if isinstance(result, ExecResult):
        return result
    return ExecResult(exit_code=result, stdout="", stderr="")


def _run_exec_maybe_capture(command: list[str], *, capture_output: bool) -> ExecResult:
    try:
        result = _run_exec(command, capture_output=capture_output)
    except TypeError as exc:
        if "capture_output" not in str(exc):
            raise
        result = _run_exec(command)
    return _coerce_exec_result(result)


def _wireguard_interface_exists() -> bool:
    return _coerce_exec_result(
        _run_exec(
        ["sh", "-lc", f"ip link show {settings.wireguard_interface_name} >/dev/null 2>&1"]
        )
    ).exit_code == 0


def _format_apply_error(prefix: str, result: ExecResult) -> str:
    detail = result.stderr.strip() or result.stdout.strip()
    if detail:
        return f"{prefix} with exit code {result.exit_code}: {detail}"
    return f"{prefix} with exit code {result.exit_code}"


def _run_wireguard_apply() -> None:
    ensure_docker_socket_available()

    if not _wireguard_interface_exists():
        result = _run_exec_maybe_capture(
            ["wg-quick", "up", settings.wireguard_config_path],
            capture_output=True,
        )
        if result.exit_code != 0:
            raise ValueError(_format_apply_error("wg-quick up failed", result))
        return

    result = _run_exec_maybe_capture(
        [
            "sh",
            "-lc",
            (
                f"wg-quick strip {settings.wireguard_config_path} | "
                f"wg syncconf {settings.wireguard_interface_name} /dev/stdin"
            ),
        ],
        capture_output=True,
    )
    if result.exit_code != 0:
        raise ValueError(_format_apply_error("wg syncconf failed", result))


def apply_server_config(session: Session) -> ApplyResult:
    artifacts = generate_server_config(session)
    server = get_server_state(session)
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
            "container_name": settings.wireguard_container_name,
            "interface_name": settings.wireguard_interface_name,
            "applied_at": applied_at.isoformat(),
        },
    )

    return ApplyResult(
        server_config_path=artifacts.server_config_path,
        peer_count=artifacts.peer_count,
        container_name=settings.wireguard_container_name,
        interface_name=settings.wireguard_interface_name,
        applied_at=applied_at,
    )
