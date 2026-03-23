from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class RuntimePeerDumpRow:
    public_key: str
    endpoint: str | None
    allowed_ips: list[str]
    latest_handshake_at: datetime | None
    received_bytes: int
    sent_bytes: int


def _parse_handshake_epoch(value: str) -> datetime | None:
    epoch = int(value)
    if epoch <= 0:
        return None
    return datetime.fromtimestamp(epoch, tz=timezone.utc)


def parse_wg_dump(raw: str) -> list[RuntimePeerDumpRow]:
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if not lines:
        return []

    peers: list[RuntimePeerDumpRow] = []
    for line in lines[1:]:
        columns = line.split("\t")
        if len(columns) < 8:
            continue
        peers.append(
            RuntimePeerDumpRow(
                public_key=columns[0],
                endpoint=None if columns[2] == "(none)" else columns[2],
                allowed_ips=[] if columns[3] == "(none)" else columns[3].split(","),
                latest_handshake_at=_parse_handshake_epoch(columns[4]),
                received_bytes=int(columns[5]),
                sent_bytes=int(columns[6]),
            )
        )
    return peers
