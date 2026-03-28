from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


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
    traffic_snapshot_retention_days: int = 30
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

    @field_validator("traffic_snapshot_retention_days")
    @classmethod
    def validate_snapshot_retention_days(cls, value: int) -> int:
        if value < 1 or value > 3650:
            raise ValueError(
                "traffic_snapshot_retention_days must be between 1 and 3650"
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
    traffic_snapshot_retention_days: int
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


class GuiLogListRead(BaseModel):
    items: list[GuiLogRead]
    total: int
    limit: int
    offset: int


class SystemVersionRead(BaseModel):
    version: str
    frontend_version: str
    runtime_adapter: str
    interface_name: str
    runtime_container_name: str | None = None
    runtime_image_name: str | None = None
    runtime_status: str | None = None
    runtime_running: bool | None = None
    runtime_started_at: datetime | None = None
    runtime_uptime_seconds: int | None = None
    runtime_restart_count: int | None = None
    last_server_state_change_at: datetime | None = None
