from __future__ import annotations

from dataclasses import dataclass

from app.runtime.dump import RuntimePeerDumpRow, parse_wg_dump
from app.runtime.wireguard import WireGuardRuntime, get_wireguard_runtime


@dataclass
class RuntimeDescriptor:
    container_name: str
    interface_name: str
    config_path: str


@dataclass
class RuntimePeerRead:
    runtime: RuntimeDescriptor
    peers: list[RuntimePeerDumpRow]


class RuntimeService:
    def __init__(self, runtime: WireGuardRuntime | None = None) -> None:
        self._runtime = runtime or get_wireguard_runtime()

    def describe(self) -> RuntimeDescriptor:
        return RuntimeDescriptor(
            container_name=self._runtime.container_name,
            interface_name=self._runtime.interface_name,
            config_path=self._runtime.config_path,
        )

    def read_peers(self) -> RuntimePeerRead:
        result = self._runtime.read_dump()
        if result.exit_code != 0:
            stderr = result.stderr.strip() or "wg show dump failed"
            raise ValueError(stderr)
        return RuntimePeerRead(
            runtime=self.describe(),
            peers=parse_wg_dump(result.stdout),
        )

    def apply_config(self) -> RuntimeDescriptor:
        self._runtime.apply_config()
        return self.describe()


def get_runtime_service(runtime: WireGuardRuntime | None = None) -> RuntimeService:
    return RuntimeService(runtime)


def read_runtime_peers(
    runtime: WireGuardRuntime | None = None,
) -> RuntimePeerRead:
    return get_runtime_service(runtime).read_peers()
