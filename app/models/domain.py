from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.main import Base


class GroupScope(StrEnum):
    ADMIN = "admin"
    MULTI_SITE = "multi_site"
    SINGLE_SITE = "single_site"

    @property
    def required_prefix(self) -> int:
        return {
            GroupScope.ADMIN: 8,
            GroupScope.MULTI_SITE: 16,
            GroupScope.SINGLE_SITE: 24,
        }[self]


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    scope: Mapped[GroupScope] = mapped_column(Enum(GroupScope), index=True)
    network_cidr: Mapped[str] = mapped_column(String(32), unique=True)
    default_allowed_ips: Mapped[list[str]] = mapped_column(JSON, default=list)
    dns_servers: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    allocation_start_host: Mapped[int] = mapped_column(default=1)
    reserved_ips: Mapped[list[str]] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[list["User"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
    )


class InitialSettings(Base):
    __tablename__ = "initial_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    endpoint_address: Mapped[str] = mapped_column(String(255))
    endpoint_port: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class GuiSettings(Base):
    __tablename__ = "gui_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    theme_mode: Mapped[str] = mapped_column(String(16), default="system")
    default_locale: Mapped[str] = mapped_column(String(16), default="en")
    overview_refresh_seconds: Mapped[int] = mapped_column(default=5)
    peers_refresh_seconds: Mapped[int] = mapped_column(default=10)
    traffic_snapshot_interval_seconds: Mapped[int] = mapped_column(default=300)
    refresh_after_apply: Mapped[bool] = mapped_column(Boolean, default=True)
    online_threshold_seconds: Mapped[int] = mapped_column(default=120)
    error_log_level: Mapped[str] = mapped_column(String(32), default="warning")
    access_log_path: Mapped[str] = mapped_column(String(255), default="none")
    error_log_path: Mapped[str] = mapped_column(String(255), default="none")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class LoginUser(Base):
    __tablename__ = "login_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    sessions: Mapped[list["LoginSession"]] = relationship(
        back_populates="login_user",
        cascade="all, delete-orphan",
    )


class LoginSession(Base):
    __tablename__ = "login_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    login_user_id: Mapped[int] = mapped_column(ForeignKey("login_users.id"), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    login_user: Mapped[LoginUser] = relationship(back_populates="sessions")


class ServerState(Base):
    __tablename__ = "server_state"

    id: Mapped[int] = mapped_column(primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(255))
    listen_port: Mapped[int]
    server_address: Mapped[str] = mapped_column(String(45))
    dns: Mapped[list[str]] = mapped_column(JSON, default=list)
    private_key: Mapped[str] = mapped_column(String(128))
    public_key: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    allowed_ips_override: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    group: Mapped[Group] = relationship(back_populates="users")
    peers: Mapped[list["Peer"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Peer(Base):
    __tablename__ = "peers"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    assigned_ip: Mapped[str] = mapped_column(String(45), unique=True, index=True)
    private_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    public_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    preshared_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_config_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    is_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    revealed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped[User] = relationship(back_populates="peers")
    traffic_snapshots: Mapped[list["PeerTrafficSnapshot"]] = relationship(
        back_populates="peer",
        cascade="all, delete-orphan",
    )


class PeerTrafficSnapshot(Base):
    __tablename__ = "peer_traffic_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    peer_id: Mapped[int] = mapped_column(ForeignKey("peers.id"), index=True)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    received_bytes: Mapped[int] = mapped_column(default=0)
    sent_bytes: Mapped[int] = mapped_column(default=0)
    total_bytes: Mapped[int] = mapped_column(default=0)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    latest_handshake_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    peer: Mapped[Peer] = relationship(back_populates="traffic_snapshots")
