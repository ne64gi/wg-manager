from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models import GroupScope
from app.schemas.domain import InitialSettingsRead, InitialSettingsUpdate
from app.schemas.gui import GuiSettingsUpdate


class StateExportPeer(BaseModel):
    name: str
    assigned_ip: str
    description: str
    is_active: bool
    private_key: str | None
    public_key: str | None
    preshared_key: str | None
    last_config_generated_at: datetime | None
    is_revealed: bool
    revealed_at: datetime | None
    revoked_at: datetime | None


class StateExportUser(BaseModel):
    name: str
    allowed_ips_override: list[str] | None
    description: str
    is_active: bool
    peers: list[StateExportPeer]


class StateExportGroup(BaseModel):
    name: str
    scope: GroupScope
    network_cidr: str
    default_allowed_ips: list[str]
    dns_servers: list[str] | None
    allocation_start_host: int
    reserved_ips: list[str]
    description: str
    is_active: bool
    users: list[StateExportUser]


class StateExportServerState(BaseModel):
    endpoint: str
    listen_port: int
    server_address: str
    dns: list[str]
    interface_mtu: int | None = None
    private_key: str
    public_key: str


class StateExportGuiSettings(BaseModel):
    theme_mode: str
    default_locale: str
    overview_refresh_seconds: int
    peers_refresh_seconds: int
    traffic_snapshot_interval_seconds: int
    refresh_after_apply: bool
    online_threshold_seconds: int
    error_log_level: str
    access_log_path: str
    error_log_path: str


class StateExportRead(BaseModel):
    version: str = "1.0.0"
    exported_at: datetime
    server_state: StateExportServerState
    initial_settings: InitialSettingsRead
    gui_settings: StateExportGuiSettings
    groups: list[StateExportGroup]


class StateImportRequest(BaseModel):
    server_state: StateExportServerState
    initial_settings: InitialSettingsUpdate
    gui_settings: GuiSettingsUpdate
    groups: list[StateExportGroup]


class StateImportResultRead(BaseModel):
    imported_group_count: int
    imported_user_count: int
    imported_peer_count: int
    imported_at: datetime
