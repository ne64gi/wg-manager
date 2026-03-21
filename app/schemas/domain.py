from __future__ import annotations

import ipaddress
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import GroupScope


def normalize_network(value: str) -> str:
    return str(ipaddress.ip_network(value, strict=True))


def normalize_ip(value: str) -> str:
    return str(ipaddress.ip_address(value))


def normalize_ip_list(values: list[str]) -> list[str]:
    normalized = []
    for value in values:
        try:
            normalized.append(str(ipaddress.ip_network(value, strict=False)))
            continue
        except ValueError:
            pass

        normalized.append(normalize_ip(value))
    return normalized


def normalize_address_list(values: list[str]) -> list[str]:
    return sorted({normalize_ip(value) for value in values})


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    scope: GroupScope
    network_cidr: str
    default_allowed_ips: list[str]
    dns_servers: list[str] | None = None
    allocation_start_host: int = 1
    reserved_ips: list[str] = Field(default_factory=list)
    description: str = ""
    is_active: bool = True

    @field_validator("network_cidr")
    @classmethod
    def validate_network(cls, value: str) -> str:
        return normalize_network(value)

    @field_validator("default_allowed_ips")
    @classmethod
    def validate_default_allowed_ips(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("default_allowed_ips must contain at least one route")
        return normalize_ip_list(value)

    @field_validator("reserved_ips")
    @classmethod
    def validate_reserved_ips(cls, value: list[str]) -> list[str]:
        return normalize_address_list(value)

    @field_validator("dns_servers")
    @classmethod
    def validate_dns_servers(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("dns_servers cannot be empty")
        return normalize_address_list(value)

    @field_validator("allocation_start_host")
    @classmethod
    def validate_allocation_start_host(cls, value: int) -> int:
        if value < 1:
            raise ValueError("allocation_start_host must be >= 1")
        return value

    @model_validator(mode="after")
    def validate_group_settings(self) -> "GroupCreate":
        network = ipaddress.ip_network(self.network_cidr, strict=True)
        if network.prefixlen != self.scope.required_prefix:
            raise ValueError(
                f"{self.scope.value} groups must use /{self.scope.required_prefix}"
            )

        host_count = network.num_addresses - 2
        if self.allocation_start_host > host_count:
            raise ValueError(
                f"allocation_start_host must be <= host count ({host_count})"
            )

        for ip in self.reserved_ips:
            if ipaddress.ip_address(ip) not in network:
                raise ValueError(f"reserved ip '{ip}' is outside group network")

        return self


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    default_allowed_ips: list[str] | None = None
    dns_servers: list[str] | None = None
    description: str | None = None
    is_active: bool | None = None

    @field_validator("default_allowed_ips")
    @classmethod
    def validate_default_allowed_ips(
        cls, value: list[str] | None
    ) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("default_allowed_ips must contain at least one route")
        return normalize_ip_list(value)

    @field_validator("dns_servers")
    @classmethod
    def validate_dns_servers(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("dns_servers cannot be empty")
        return normalize_address_list(value)


class GroupAllocationUpdate(BaseModel):
    allocation_start_host: int = 1
    reserved_ips: list[str] = Field(default_factory=list)

    @field_validator("reserved_ips")
    @classmethod
    def validate_reserved_ips(cls, value: list[str]) -> list[str]:
        return normalize_address_list(value)

    @field_validator("allocation_start_host")
    @classmethod
    def validate_allocation_start_host(cls, value: int) -> int:
        if value < 1:
            raise ValueError("allocation_start_host must be >= 1")
        return value


class GroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    scope: GroupScope
    network_cidr: str
    default_allowed_ips: list[str]
    dns_servers: list[str] | None
    allocation_start_host: int
    reserved_ips: list[str]
    description: str
    is_active: bool


class UserCreate(BaseModel):
    group_id: int
    name: str = Field(min_length=1, max_length=100)
    allowed_ips_override: list[str] | None = None
    description: str = ""
    is_active: bool = True

    @field_validator("allowed_ips_override")
    @classmethod
    def validate_allowed_ips_override(
        cls, value: list[str] | None
    ) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("allowed_ips_override cannot be empty")
        return normalize_ip_list(value)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    allowed_ips_override: list[str] | None = None
    description: str | None = None
    is_active: bool | None = None

    @field_validator("allowed_ips_override")
    @classmethod
    def validate_allowed_ips_override(
        cls, value: list[str] | None
    ) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("allowed_ips_override cannot be empty")
        return normalize_ip_list(value)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    name: str
    allowed_ips_override: list[str] | None
    description: str
    is_active: bool


class PeerCreate(BaseModel):
    user_id: int
    name: str = Field(min_length=1, max_length=100)
    assigned_ip: str | None = None
    description: str = ""
    is_active: bool = True

    @field_validator("assigned_ip")
    @classmethod
    def validate_assigned_ip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_ip(value)


class PeerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    assigned_ip: str | None = None
    description: str | None = None
    is_active: bool | None = None

    @field_validator("assigned_ip")
    @classmethod
    def validate_assigned_ip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_ip(value)


class PeerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    assigned_ip: str
    public_key: str | None
    description: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    revoked_at: datetime | None
    last_config_generated_at: datetime | None
    is_revealed: bool
    revealed_at: datetime | None


class GeneratedPeerArtifacts(BaseModel):
    peer_id: int
    peer_name: str
    config_path: str
    qr_path: str
    last_config_generated_at: datetime


class RevealedPeerArtifacts(BaseModel):
    peer_id: int
    peer_name: str
    config_text: str
    qr_svg: str
    revealed_at: datetime


class GeneratedServerArtifacts(BaseModel):
    server_config_path: str
    peer_count: int


class ApplyResult(BaseModel):
    server_config_path: str
    peer_count: int
    container_name: str
    interface_name: str
    applied_at: datetime


class ServerStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    endpoint: str
    listen_port: int
    server_address: str
    dns: list[str]
    public_key: str


class InitialSettingsUpdate(BaseModel):
    endpoint_address: str = Field(min_length=1, max_length=255)
    endpoint_port: int = Field(ge=1, le=65535)


class InitialSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    endpoint_address: str
    endpoint_port: int
    created_at: datetime
    updated_at: datetime


def _normalize_log_level(value: str) -> str:
    normalized = value.strip().lower()
    allowed = {"debug", "info", "warning", "error", "critical"}
    if normalized not in allowed:
        raise ValueError(f"log level must be one of: {', '.join(sorted(allowed))}")
    return normalized


def _normalize_theme_mode(value: str) -> str:
    normalized = value.strip().lower()
    allowed = {"light", "dark", "system"}
    if normalized not in allowed:
        raise ValueError(f"theme_mode must be one of: {', '.join(sorted(allowed))}")
    return normalized


def _normalize_locale(value: str) -> str:
    normalized = value.strip().lower()
    allowed = {"en", "ja"}
    if normalized not in allowed:
        raise ValueError(f"default_locale must be one of: {', '.join(sorted(allowed))}")
    return normalized


class GuiSettingsUpdate(BaseModel):
    theme_mode: str = "system"
    default_locale: str = "en"
    overview_refresh_seconds: int = 5
    peers_refresh_seconds: int = 10
    traffic_snapshot_interval_seconds: int = 300
    refresh_after_apply: bool = True
    online_threshold_seconds: int = 120
    error_log_level: str = "warning"
    access_log_path: str = "none"
    error_log_path: str = "none"

    @field_validator("theme_mode")
    @classmethod
    def validate_theme_mode(cls, value: str) -> str:
        return _normalize_theme_mode(value)

    @field_validator("default_locale")
    @classmethod
    def validate_default_locale(cls, value: str) -> str:
        return _normalize_locale(value)

    @field_validator("overview_refresh_seconds", "peers_refresh_seconds")
    @classmethod
    def validate_refresh_seconds(cls, value: int) -> int:
        if value < 1 or value > 3600:
            raise ValueError("refresh interval seconds must be between 1 and 3600")
        return value

    @field_validator("traffic_snapshot_interval_seconds")
    @classmethod
    def validate_snapshot_interval_seconds(cls, value: int) -> int:
        if value < 10 or value > 86400:
            raise ValueError(
                "traffic_snapshot_interval_seconds must be between 10 and 86400"
            )
        return value

    @field_validator("online_threshold_seconds")
    @classmethod
    def validate_online_threshold_seconds(cls, value: int) -> int:
        if value < 5 or value > 3600:
            raise ValueError("online_threshold_seconds must be between 5 and 3600")
        return value

    @field_validator("error_log_level")
    @classmethod
    def validate_error_log_level(cls, value: str) -> str:
        return _normalize_log_level(value)

    @field_validator("access_log_path", "error_log_path")
    @classmethod
    def validate_log_path(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("log path cannot be empty")
        return normalized


class GuiSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
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
    created_at: datetime
    updated_at: datetime


class LoginUserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=255)
    description: str = ""
    is_active: bool = True


class LoginUserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=255)
    description: str | None = None
    is_active: bool | None = None


class LoginUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    description: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AuthLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=255)


class AuthSetupStatusRead(BaseModel):
    has_login_users: bool


class AuthSetupRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=255)


class AuthChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=8, max_length=255)


class AuthRefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=2048)


class AuthLogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=2048)


class TokenPairRead(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime


class AuthenticatedLoginUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    description: str
    is_active: bool
    last_login_at: datetime | None


class GuiLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    occurred_at: datetime
    level: str
    category: str
    message: str
    login_user_id: int | None
    username: str | None
    request_path: str | None
    request_method: str | None
    status_code: int | None
    details: dict


class SystemVersionRead(BaseModel):
    version: str
    frontend_version: str


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


class PeerResolvedAccess(BaseModel):
    peer_id: int
    peer_name: str
    assigned_ip: str
    user_id: int
    user_name: str
    group_id: int
    group_name: str
    group_scope: GroupScope
    group_network_cidr: str
    effective_allowed_ips: list[str]

