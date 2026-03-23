from app.core import settings
from app.runtime import get_artifact_store, get_wireguard_runtime
from app.runtime.wireguard import DockerWireGuardRuntime


def test_get_artifact_store_uses_configured_root(tmp_path) -> None:
    previous_root = settings.artifact_root
    settings.artifact_root = str(tmp_path / "artifacts")
    try:
        store = get_artifact_store()
        assert store.root == tmp_path / "artifacts"
        assert store.server_config_path() == tmp_path / "artifacts" / "wg_confs" / "wg0.conf"
        assert store.peer_config_path("alpha") == tmp_path / "artifacts" / "peers" / "alpha.conf"
    finally:
        settings.artifact_root = previous_root


def test_get_wireguard_runtime_defaults_to_docker_adapter() -> None:
    runtime = get_wireguard_runtime()
    assert isinstance(runtime, DockerWireGuardRuntime)


def test_get_wireguard_runtime_rejects_unknown_adapter() -> None:
    previous_adapter = settings.runtime_adapter
    settings.runtime_adapter = "unknown"
    try:
        try:
            get_wireguard_runtime()
        except ValueError as exc:
            assert "unsupported runtime adapter" in str(exc)
        else:
            raise AssertionError("expected unsupported runtime adapter to raise")
    finally:
        settings.runtime_adapter = previous_adapter
