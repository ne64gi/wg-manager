from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models import GroupScope


class SyncStateRead(BaseModel):
    interface_name: str
    status: str
    desired_peer_count: int
    runtime_peer_count: int
    pending_generation_count: int
    drift_detected: bool
    drift_reasons: list[str]
    last_generated_at: datetime | None
    last_runtime_sync_at: datetime | None


class PeerStatusRead(BaseModel):
    peer_id: int
    peer_name: str
    user_id: int
    user_name: str
    public_key: str | None
    assigned_ip: str
    endpoint: str | None
    latest_handshake_at: datetime | None
    received_bytes: int
    sent_bytes: int
    total_bytes: int
    is_online: bool
    is_active: bool
    is_revealed: bool
    description: str
    effective_allowed_ips: list[str]


class WireGuardOverviewRead(BaseModel):
    interface_name: str
    total_received_bytes: int
    total_sent_bytes: int
    total_usage_bytes: int
    peer_count: int
    active_peer_count: int
    online_peer_count: int


class WireGuardOverviewHistoryPointRead(BaseModel):
    captured_at: datetime
    total_received_bytes: int
    total_sent_bytes: int
    total_usage_bytes: int
    online_peer_count: int


class UserTrafficSummaryRead(BaseModel):
    user_id: int
    user_name: str
    group_id: int
    group_name: str
    peer_count: int
    active_peer_count: int
    online_peer_count: int
    total_received_bytes: int
    total_sent_bytes: int
    total_usage_bytes: int


class GroupTrafficSummaryRead(BaseModel):
    group_id: int
    group_name: str
    group_scope: GroupScope
    user_count: int
    peer_count: int
    active_peer_count: int
    online_peer_count: int
    total_received_bytes: int
    total_sent_bytes: int
    total_usage_bytes: int
