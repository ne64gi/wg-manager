from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.runtime.artifacts import ArtifactStore, get_artifact_store
from app.runtime.dump import RuntimePeerDumpRow, parse_wg_dump
from app.runtime.wireguard import RuntimeMetadata, WireGuardRuntime, get_wireguard_runtime


@dataclass
class RuntimeDescriptor:
    runtime_adapter: str
    interface_name: str
    container_name: str | None = None
    image_name: str | None = None
    status: str | None = None
    is_running: bool | None = None
    started_at: datetime | None = None
    uptime_seconds: int | None = None
    restart_count: int | None = None


@dataclass
class RuntimePeerRead:
    runtime: RuntimeDescriptor
    peers: list[RuntimePeerDumpRow]


@dataclass
class PeerArtifactPaths:
    config_path: Path
    qr_path: Path


class RuntimeService:
    def __init__(
        self,
        runtime: WireGuardRuntime | None = None,
        artifact_store: ArtifactStore | None = None,
    ) -> None:
        self._runtime = runtime or get_wireguard_runtime()
        self._artifact_store = artifact_store or get_artifact_store()

    def describe(self) -> RuntimeDescriptor:
        try:
            metadata = self._runtime.describe_runtime()
        except (ValueError, AttributeError):
            metadata = RuntimeMetadata(
                runtime_adapter=self._runtime.adapter_name,
                interface_name=self._runtime.interface_name,
            )

        return RuntimeDescriptor(
            runtime_adapter=metadata.runtime_adapter,
            interface_name=metadata.interface_name,
            container_name=metadata.container_name,
            image_name=metadata.image_name,
            status=metadata.status,
            is_running=metadata.is_running,
            started_at=metadata.started_at,
            uptime_seconds=metadata.uptime_seconds,
            restart_count=metadata.restart_count,
        )

    def server_config_path(self) -> Path:
        return self._artifact_store.server_config_path()

    def peer_artifact_paths(self, peer_name: str) -> PeerArtifactPaths:
        return PeerArtifactPaths(
            config_path=self._artifact_store.peer_config_path(peer_name),
            qr_path=self._artifact_store.peer_qr_path(peer_name),
        )

    def write_server_config(self, contents: str) -> Path:
        path = self.server_config_path()
        self._artifact_store.write_text(path, contents)
        return path

    def read_server_config_text(self) -> str | None:
        path = self.server_config_path()
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8")

    def write_peer_config(self, peer_name: str, contents: str) -> Path:
        path = self.peer_artifact_paths(peer_name).config_path
        self._artifact_store.write_text(path, contents)
        return path

    def write_peer_qr(self, peer_name: str, contents: bytes) -> Path:
        path = self.peer_artifact_paths(peer_name).qr_path
        self._artifact_store.write_bytes(path, contents)
        return path

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


def get_runtime_service(
    runtime: WireGuardRuntime | None = None,
    artifact_store: ArtifactStore | None = None,
) -> RuntimeService:
    return RuntimeService(runtime, artifact_store)


def read_runtime_peers(
    runtime: WireGuardRuntime | None = None,
) -> RuntimePeerRead:
    return get_runtime_service(runtime).read_peers()
