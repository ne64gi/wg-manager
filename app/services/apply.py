from __future__ import annotations

import http.client
import json
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.core import settings
from app.schemas import ApplyResult
from app.services.audit import log_operation
from app.services.config_generation import generate_server_config
from app.services.domain import get_server_state


class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_path: str) -> None:
        super().__init__("localhost")
        self.socket_path = socket_path

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self.socket_path)


def _docker_request(
    method: str,
    path: str,
    *,
    body: dict | None = None,
) -> dict | list | None:
    connection = UnixHTTPConnection(settings.docker_socket_path)
    payload = None
    headers: dict[str, str] = {}
    if body is not None:
        payload = json.dumps(body)
        headers["Content-Type"] = "application/json"

    try:
        connection.request(method, path, body=payload, headers=headers)
        response = connection.getresponse()
        raw = response.read()
    finally:
        connection.close()

    if response.status >= 400:
        message = raw.decode("utf-8", errors="replace") if raw else response.reason
        raise ValueError(f"Docker API error {response.status}: {message}")

    if not raw:
        return None
    return json.loads(raw.decode("utf-8"))


def _run_exec(command: list[str]) -> int:
    container_name = quote(settings.wireguard_container_name, safe="")
    create_response = _docker_request(
        "POST",
        f"/v1.41/containers/{container_name}/exec",
        body={
            "AttachStdout": False,
            "AttachStderr": False,
            "Cmd": command,
        },
    )
    if not isinstance(create_response, dict) or "Id" not in create_response:
        raise ValueError("failed to create WireGuard exec instance")

    exec_id = create_response["Id"]
    _docker_request(
        "POST",
        f"/v1.41/exec/{quote(exec_id, safe='')}/start",
        body={"Detach": False, "Tty": False},
    )

    deadline = time.monotonic() + 10
    inspect_response: dict | None = None
    while time.monotonic() < deadline:
        payload = _docker_request(
            "GET",
            f"/v1.41/exec/{quote(exec_id, safe='')}/json",
        )
        if not isinstance(payload, dict):
            raise ValueError("failed to inspect WireGuard exec instance")
        inspect_response = payload
        if not payload.get("Running", False):
            break
        time.sleep(0.1)

    if inspect_response is None or inspect_response.get("Running", False):
        raise ValueError("timed out while applying WireGuard configuration")

    return int(inspect_response.get("ExitCode", 1))


def _wireguard_interface_exists() -> bool:
    return _run_exec(
        ["sh", "-lc", f"ip link show {settings.wireguard_interface_name} >/dev/null 2>&1"]
    ) == 0


def _run_wireguard_apply() -> None:
    socket_path = Path(settings.docker_socket_path)
    if not socket_path.exists():
        raise ValueError(
            f"Docker socket '{settings.docker_socket_path}' is not available"
        )

    if not _wireguard_interface_exists():
        exit_code = _run_exec(
            ["wg-quick", "up", settings.wireguard_config_path]
        )
        if exit_code != 0:
            raise ValueError(f"wg-quick up failed with exit code {exit_code}")
        return

    exit_code = _run_exec(
        [
            "sh",
            "-lc",
            (
                f"wg-quick strip {settings.wireguard_config_path} | "
                f"wg syncconf {settings.wireguard_interface_name} /dev/stdin"
            ),
        ]
    )
    if exit_code != 0:
        raise ValueError(f"wg syncconf failed with exit code {exit_code}")


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
