from __future__ import annotations

from pathlib import Path
import tempfile
from typing import Protocol

from app.core import settings


class ArtifactStore(Protocol):
    @property
    def root(self) -> Path: ...

    def server_config_path(self) -> Path: ...

    def peer_config_path(self, peer_name: str) -> Path: ...

    def peer_qr_path(self, peer_name: str) -> Path: ...

    def write_text(self, path: Path, contents: str) -> None: ...

    def write_bytes(self, path: Path, contents: bytes) -> None: ...


class LocalFilesystemArtifactStore:
    def __init__(self, root: str | Path) -> None:
        self._root = Path(root)

    @property
    def root(self) -> Path:
        self._root.mkdir(parents=True, exist_ok=True)
        return self._root

    def server_config_path(self) -> Path:
        path = self.root / "wg_confs" / "wg0.conf"
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def peer_config_path(self, peer_name: str) -> Path:
        path = self.root / "peers" / f"{peer_name}.conf"
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def peer_qr_path(self, peer_name: str) -> Path:
        path = self.root / "peers" / f"{peer_name}.svg"
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def write_text(self, path: Path, contents: str) -> None:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            delete=False,
            dir=path.parent,
            prefix=f"{path.name}.",
            suffix=".tmp",
        ) as handle:
            handle.write(contents)
            temp_path = Path(handle.name)
        temp_path.replace(path)

    def write_bytes(self, path: Path, contents: bytes) -> None:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            delete=False,
            dir=path.parent,
            prefix=f"{path.name}.",
            suffix=".tmp",
        ) as handle:
            handle.write(contents)
            temp_path = Path(handle.name)
        temp_path.replace(path)


def get_artifact_store() -> ArtifactStore:
    return LocalFilesystemArtifactStore(settings.artifact_root)
