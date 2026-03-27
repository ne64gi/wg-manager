from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
