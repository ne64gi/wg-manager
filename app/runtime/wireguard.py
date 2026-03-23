from __future__ import annotations

import http.client
import json
import socket
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
from urllib.parse import quote

from app.core import settings


@dataclass
class ExecResult:
    exit_code: int
    stdout: str
    stderr: str


class WireGuardRuntime(Protocol):
    adapter_name: str
    interface_name: str

    def ensure_available(self) -> None: ...

    def read_dump(self) -> ExecResult: ...

    def apply_config(self) -> None: ...


class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_path: str) -> None:
        super().__init__("localhost")
        self.socket_path = socket_path

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self.socket_path)


class DockerWireGuardRuntime:
    adapter_name = "docker_container"

    def __init__(
        self,
        *,
        docker_socket_path: str,
        container_name: str,
        interface_name: str,
        config_path: str,
    ) -> None:
        self._docker_socket_path = docker_socket_path
        self.container_name = container_name
        self.interface_name = interface_name
        self.config_path = config_path

    def ensure_available(self) -> None:
        socket_path = Path(self._docker_socket_path)
        if not socket_path.exists():
            raise ValueError(
                f"runtime control socket '{self._docker_socket_path}' is not available"
            )

    def _docker_request_json(
        self,
        method: str,
        path: str,
        *,
        body: dict | None = None,
    ) -> dict | list | None:
        connection = UnixHTTPConnection(self._docker_socket_path)
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
            raise ValueError(f"runtime control request failed ({response.status}): {message}")

        if not raw:
            return None
        return json.loads(raw.decode("utf-8"))

    def _docker_request_raw(
        self,
        method: str,
        path: str,
        *,
        body: dict | None = None,
    ) -> bytes:
        connection = UnixHTTPConnection(self._docker_socket_path)
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
            raise ValueError(f"runtime control request failed ({response.status}): {message}")
        return raw

    def _demux_exec_output(self, raw: bytes) -> tuple[str, str]:
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

    def exec(self, command: list[str], *, capture_output: bool = False) -> ExecResult:
        self.ensure_available()

        container_name = quote(self.container_name, safe="")
        create_response = self._docker_request_json(
            "POST",
            f"/v1.41/containers/{container_name}/exec",
            body={
                "AttachStdout": capture_output,
                "AttachStderr": capture_output,
                "Cmd": command,
            },
        )
        if not isinstance(create_response, dict) or "Id" not in create_response:
            raise ValueError("failed to create runtime command instance")

        exec_id = create_response["Id"]
        raw_output = self._docker_request_raw(
            "POST",
            f"/v1.41/exec/{quote(exec_id, safe='')}/start",
            body={"Detach": False, "Tty": False},
        )

        deadline = time.monotonic() + 10
        inspect_response: dict | None = None
        while time.monotonic() < deadline:
            payload = self._docker_request_json(
                "GET",
                f"/v1.41/exec/{quote(exec_id, safe='')}/json",
            )
            if not isinstance(payload, dict):
                raise ValueError("failed to inspect runtime command instance")
            inspect_response = payload
            if not payload.get("Running", False):
                break
            time.sleep(0.1)

        if inspect_response is None or inspect_response.get("Running", False):
            raise ValueError("timed out while executing runtime command")

        stdout, stderr = self._demux_exec_output(raw_output) if capture_output else ("", "")
        return ExecResult(
            exit_code=int(inspect_response.get("ExitCode", 1)),
            stdout=stdout,
            stderr=stderr,
        )

    def interface_exists(self) -> bool:
        return (
            self.exec(
                ["sh", "-lc", f"ip link show {self.interface_name} >/dev/null 2>&1"]
            ).exit_code
            == 0
        )

    def read_dump(self) -> ExecResult:
        return self.exec(
            ["wg", "show", self.interface_name, "dump"],
            capture_output=True,
        )

    def _format_apply_error(self, prefix: str, result: ExecResult) -> str:
        detail = result.stderr.strip() or result.stdout.strip()
        if detail:
            return f"{prefix} with exit code {result.exit_code}: {detail}"
        return f"{prefix} with exit code {result.exit_code}"

    def apply_config(self) -> None:
        self.ensure_available()

        if not self.interface_exists():
            result = self.exec(
                ["wg-quick", "up", self.config_path],
                capture_output=True,
            )
            if result.exit_code != 0:
                raise ValueError(self._format_apply_error("wg-quick up failed", result))
            return

        result = self.exec(
            [
                "sh",
                "-lc",
                (
                    f"wg-quick strip {self.config_path} | "
                    f"wg syncconf {self.interface_name} /dev/stdin"
                ),
            ],
            capture_output=True,
        )
        if result.exit_code != 0:
            raise ValueError(self._format_apply_error("wg syncconf failed", result))
def get_wireguard_runtime() -> WireGuardRuntime:
    if settings.runtime_adapter != "docker_container":
        raise ValueError(
            f"unsupported runtime adapter '{settings.runtime_adapter}'"
        )
    return DockerWireGuardRuntime(
        docker_socket_path=settings.docker_socket_path,
        container_name=settings.wireguard_container_name,
        interface_name=settings.wireguard_interface_name,
        config_path=settings.wireguard_config_path,
    )
