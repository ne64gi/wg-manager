from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import LoginUserRole


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


class AuthUpdateProfileRequest(BaseModel):
    email: str | None = Field(default=None, max_length=255)
    description: str | None = None
    preferred_theme_mode: str = "system"
    preferred_locale: str = "en"
    preferred_timezone: str = Field(default="UTC", min_length=1, max_length=64)
    avatar_url: str | None = Field(default=None, max_length=512)

    @field_validator("preferred_theme_mode")
    @classmethod
    def validate_preferred_theme_mode(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"light", "dark", "system"}:
            raise ValueError("preferred_theme_mode must be one of: dark, light, system")
        return normalized

    @field_validator("preferred_locale")
    @classmethod
    def validate_preferred_locale(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"en", "ja"}:
            raise ValueError("preferred_locale must be one of: en, ja")
        return normalized

    @field_validator("preferred_timezone")
    @classmethod
    def validate_preferred_timezone(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("preferred_timezone cannot be empty")
        return normalized


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
    group_id: int | None
    email: str | None
    role: LoginUserRole
    description: str
    preferred_theme_mode: str
    locale: str
    timezone: str
    avatar_url: str | None
    is_active: bool
    last_login_at: datetime | None
