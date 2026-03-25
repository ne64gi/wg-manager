from app.core import settings
from app.runtime import (
    ExecResult,
    get_artifact_store,
    get_runtime_service,
    get_wireguard_runtime,
    parse_wg_dump,
    read_runtime_peers,
)
from app.runtime.artifacts import LocalFilesystemArtifactStore
from app.runtime.service import RuntimeService
from app.runtime.wireguard import DockerWireGuardRuntime


def test_get_artifact_store_uses_configured_root(tmp_path) -> None:
    previous_root = settings.artifact_root
    settings.artifact_root = str(tmp_path / "artifacts")
    try:
        store = get_artifact_store()
        assert isinstance(store, LocalFilesystemArtifactStore)
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


def test_get_wireguard_runtime_respects_docker_api_version() -> None:
    previous_api_version = settings.docker_api_version
    settings.docker_api_version = "v1.44"
    try:
        runtime = get_wireguard_runtime()
        assert isinstance(runtime, DockerWireGuardRuntime)
        assert runtime.docker_api_version == "v1.44"
    finally:
        settings.docker_api_version = previous_api_version


def test_parse_wg_dump_returns_runtime_rows() -> None:
    raw = (
        "private\tpublic\t51820\toff\n"
        "pubkey-1\tpsk\t198.51.100.10:51820\t10.0.0.2/32,10.0.0.3/32\t1710000000\t42\t84\t25\n"
    )

    rows = parse_wg_dump(raw)

    assert len(rows) == 1
    assert rows[0].public_key == "pubkey-1"
    assert rows[0].endpoint == "198.51.100.10:51820"
    assert rows[0].allowed_ips == ["10.0.0.2/32", "10.0.0.3/32"]
    assert rows[0].received_bytes == 42
    assert rows[0].sent_bytes == 84
    assert rows[0].latest_handshake_at is not None


def test_read_runtime_peers_returns_runtime_and_rows() -> None:
    class FakeRuntime:
        adapter_name = "fake_runtime"
        interface_name = "wg0"

        def ensure_available(self) -> None:
            return None

        def read_dump(self) -> ExecResult:
            return ExecResult(
                exit_code=0,
                stdout=(
                    "private\tpublic\t51820\toff\n"
                    "pubkey-2\tpsk\t198.51.100.11:51820\t10.0.0.4/32\t1710000100\t10\t20\t25\n"
                ),
                stderr="",
            )

        def apply_config(self) -> None:
            return None

    result = read_runtime_peers(FakeRuntime())

    assert result.runtime.interface_name == "wg0"
    assert result.runtime.runtime_adapter == "fake_runtime"
    assert len(result.peers) == 1
    assert result.peers[0].public_key == "pubkey-2"


def test_read_runtime_peers_raises_on_runtime_failure() -> None:
    class FakeRuntime:
        adapter_name = "fake_runtime"
        interface_name = "wg0"

        def ensure_available(self) -> None:
            return None

        def read_dump(self) -> ExecResult:
            return ExecResult(exit_code=1, stdout="", stderr="wg failed")

        def apply_config(self) -> None:
            return None

    try:
        read_runtime_peers(FakeRuntime())
    except ValueError as exc:
        assert str(exc) == "wg failed"
    else:
        raise AssertionError("expected runtime dump failure to raise")


def test_runtime_service_apply_returns_runtime_descriptor() -> None:
    class FakeRuntime:
        adapter_name = "fake_runtime"
        interface_name = "wg0"

        def ensure_available(self) -> None:
            return None

        def read_dump(self) -> ExecResult:
            return ExecResult(exit_code=0, stdout="private\tpublic\t51820\toff\n", stderr="")

        def apply_config(self) -> None:
            return None

    service = get_runtime_service(FakeRuntime())

    assert isinstance(service, RuntimeService)
    descriptor = service.apply_config()
    assert descriptor.runtime_adapter == "fake_runtime"
    assert descriptor.interface_name == "wg0"


def test_runtime_service_writes_server_and_peer_artifacts(tmp_path) -> None:
    class FakeRuntime:
        adapter_name = "fake_runtime"
        interface_name = "wg0"

        def ensure_available(self) -> None:
            return None

        def read_dump(self) -> ExecResult:
            return ExecResult(exit_code=0, stdout="private\tpublic\t51820\toff\n", stderr="")

        def apply_config(self) -> None:
            return None

    service = get_runtime_service(
        FakeRuntime(),
        LocalFilesystemArtifactStore(tmp_path / "artifacts"),
    )

    server_config_path = service.write_server_config("[Interface]\nAddress = 10.0.0.1/24\n")
    peer_config_path = service.write_peer_config("alpha", "[Interface]\nAddress = 10.0.0.2/32\n")
    peer_qr_path = service.write_peer_qr("alpha", b"<svg />")

    assert server_config_path.exists()
    assert server_config_path.read_text(encoding="utf-8").startswith("[Interface]")
    assert peer_config_path.exists()
    assert peer_config_path.read_text(encoding="utf-8").endswith("/32\n")
    assert peer_qr_path.exists()
    assert peer_qr_path.read_bytes() == b"<svg />"
