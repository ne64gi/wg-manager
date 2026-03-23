from app.core import settings
from app.runtime import get_artifact_store, get_wireguard_runtime, parse_wg_dump
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
