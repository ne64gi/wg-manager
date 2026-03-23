from __future__ import annotations

from dataclasses import dataclass

from app.runtime.dump import RuntimePeerDumpRow, parse_wg_dump
from app.runtime.wireguard import WireGuardRuntime, get_wireguard_runtime


@dataclass
class RuntimePeerRead:
    runtime: WireGuardRuntime
    peers: list[RuntimePeerDumpRow]


def read_runtime_peers(
    runtime: WireGuardRuntime | None = None,
) -> RuntimePeerRead:
    resolved_runtime = runtime or get_wireguard_runtime()
    result = resolved_runtime.read_dump()
    if result.exit_code != 0:
        stderr = result.stderr.strip() or "wg show dump failed"
        raise ValueError(stderr)
    return RuntimePeerRead(
        runtime=resolved_runtime,
        peers=parse_wg_dump(result.stdout),
    )
