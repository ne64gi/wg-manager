from __future__ import annotations

import http.client
import json
import socket
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

from app.core import settings


class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_path: str) -> None:
        super().__init__("localhost")
        self.socket_path = socket_path

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self.socket_path)


@dataclass
class ExecResult:
    exit_code: int
    stdout: str
    stderr: str


def ensure_docker_socket_available() -> None:
    socket_path = Path(settings.docker_socket_path)
    if not socket_path.exists():
        raise ValueError(
            f"Docker socket '{settings.docker_socket_path}' is not available"
        )


def _docker_request_json(
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


def _docker_request_raw(
    method: str,
    path: str,
    *,
    body: dict | None = None,
) -> bytes:
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
    return raw


def _demux_exec_output(raw: bytes) -> tuple[str, str]:
    stdout_chunks: list[bytes] = []
    stderr_chunks: list[bytes] = []
    offset = 0

    while offset + 8 <= len(raw):
        stream_type = raw[offset]
        size = int.from_bytes(raw[offset + 4 : offset + 8], byteorder="big")
        offset += 8
        chunk = raw[offset : offset + size]
        offset += size

        if stream_type == 1:
            stdout_chunks.append(chunk)
        elif stream_type == 2:
            stderr_chunks.append(chunk)

    if offset == 0:
        return raw.decode("utf-8", errors="replace"), ""

    return (
        b"".join(stdout_chunks).decode("utf-8", errors="replace"),
        b"".join(stderr_chunks).decode("utf-8", errors="replace"),
    )


def docker_exec(command: list[str], *, capture_output: bool = False) -> ExecResult:
    ensure_docker_socket_available()

    container_name = quote(settings.wireguard_container_name, safe="")
    create_response = _docker_request_json(
        "POST",
        f"/v1.41/containers/{container_name}/exec",
        body={
            "AttachStdout": capture_output,
            "AttachStderr": capture_output,
            "Cmd": command,
        },
    )
    if not isinstance(create_response, dict) or "Id" not in create_response:
        raise ValueError("failed to create WireGuard exec instance")

    exec_id = create_response["Id"]
    raw_output = _docker_request_raw(
        "POST",
        f"/v1.41/exec/{quote(exec_id, safe='')}/start",
        body={"Detach": False, "Tty": False},
    )

    deadline = time.monotonic() + 10
    inspect_response: dict | None = None
    while time.monotonic() < deadline:
        payload = _docker_request_json(
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
        raise ValueError("timed out while executing command in WireGuard container")

    stdout, stderr = _demux_exec_output(raw_output) if capture_output else ("", "")
    return ExecResult(
        exit_code=int(inspect_response.get("ExitCode", 1)),
        stdout=stdout,
        stderr=stderr,
    )
