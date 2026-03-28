from __future__ import annotations

import base64
import os
from datetime import datetime, timezone

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import x25519
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

import app.models  # noqa: F401  # ensure all SQLAlchemy models register before create_all
from app.core import settings
from app.db import Base, engine
from app.models import InitialSettings, ServerState
from app.schemas.domain import InitialSettingsUpdate
from app.services.audit import init_log_db, log_operation


def _datetime_sql_type() -> str:
    if engine.dialect.name == "postgresql":
        return "TIMESTAMP WITH TIME ZONE"
    return "DATETIME"


def _migrate_groups_table() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "groups" not in inspector.get_table_names():
            return
        columns = {column["name"] for column in inspector.get_columns("groups")}
        if "allocation_start_host" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE groups ADD COLUMN allocation_start_host INTEGER NOT NULL DEFAULT 1"
                )
            )
        if "reserved_ips" not in columns:
            connection.execute(text("ALTER TABLE groups ADD COLUMN reserved_ips JSON"))
        if "dns_servers" not in columns:
            connection.execute(text("ALTER TABLE groups ADD COLUMN dns_servers JSON"))

        connection.execute(
            text(
                "UPDATE groups SET allocation_start_host = 1 WHERE allocation_start_host IS NULL"
            )
        )
        connection.execute(
            text("UPDATE groups SET reserved_ips = '[]' WHERE reserved_ips IS NULL")
        )


def _migrate_peers_table() -> None:
    datetime_type = _datetime_sql_type()
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "peers" not in inspector.get_table_names():
            return
        columns = {column["name"] for column in inspector.get_columns("peers")}
        if "created_at" not in columns:
            connection.execute(
                text(f"ALTER TABLE peers ADD COLUMN created_at {datetime_type}")
            )
        if "updated_at" not in columns:
            connection.execute(
                text(f"ALTER TABLE peers ADD COLUMN updated_at {datetime_type}")
            )
        if "revoked_at" not in columns:
            connection.execute(
                text(f"ALTER TABLE peers ADD COLUMN revoked_at {datetime_type}")
            )
        if "last_config_generated_at" not in columns:
            connection.execute(
                text(
                    f"ALTER TABLE peers ADD COLUMN last_config_generated_at {datetime_type}"
                )
            )
        if "is_revealed" not in columns:
            connection.execute(
                text("ALTER TABLE peers ADD COLUMN is_revealed BOOLEAN NOT NULL DEFAULT FALSE")
            )
        if "revealed_at" not in columns:
            connection.execute(
                text(f"ALTER TABLE peers ADD COLUMN revealed_at {datetime_type}")
            )
        if "private_key" not in columns:
            connection.execute(text("ALTER TABLE peers ADD COLUMN private_key VARCHAR(128)"))
        if "public_key" not in columns:
            connection.execute(text("ALTER TABLE peers ADD COLUMN public_key VARCHAR(128)"))
        if "preshared_key" not in columns:
            connection.execute(text("ALTER TABLE peers ADD COLUMN preshared_key VARCHAR(128)"))

        connection.execute(
            text(
                "UPDATE peers SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
            )
        )
        connection.execute(
            text(
                "UPDATE peers SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"
            )
        )
        connection.execute(
            text("UPDATE peers SET is_revealed = FALSE WHERE is_revealed IS NULL")
        )


def _migrate_gui_settings_table() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "gui_settings" not in inspector.get_table_names():
            return
        columns = {column["name"] for column in inspector.get_columns("gui_settings")}
        if "theme_mode" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE gui_settings ADD COLUMN theme_mode VARCHAR(16) NOT NULL DEFAULT 'system'"
                )
            )
        if "default_locale" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE gui_settings ADD COLUMN default_locale VARCHAR(16) NOT NULL DEFAULT 'en'"
                )
            )
        if "overview_refresh_seconds" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE gui_settings ADD COLUMN overview_refresh_seconds INTEGER NOT NULL DEFAULT 5"
                )
            )
        if "peers_refresh_seconds" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE gui_settings ADD COLUMN peers_refresh_seconds INTEGER NOT NULL DEFAULT 10"
                )
            )
        if "traffic_snapshot_interval_seconds" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE gui_settings ADD COLUMN traffic_snapshot_interval_seconds INTEGER NOT NULL DEFAULT 300"
                )
            )
        if "refresh_after_apply" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE gui_settings ADD COLUMN refresh_after_apply BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )
        if "online_threshold_seconds" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE gui_settings ADD COLUMN online_threshold_seconds INTEGER NOT NULL DEFAULT 120"
                )
            )


def _migrate_initial_settings_table() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "initial_settings" not in inspector.get_table_names():
            return
        columns = {column["name"] for column in inspector.get_columns("initial_settings")}
        if "interface_mtu" not in columns:
            connection.execute(
                text("ALTER TABLE initial_settings ADD COLUMN interface_mtu INTEGER")
            )


def _migrate_peer_traffic_snapshots_table() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "peer_traffic_snapshots" not in inspector.get_table_names():
            return

        if engine.dialect.name == "postgresql":
            connection.execute(
                text(
                    "ALTER TABLE peer_traffic_snapshots "
                    "ALTER COLUMN received_bytes TYPE BIGINT, "
                    "ALTER COLUMN sent_bytes TYPE BIGINT, "
                    "ALTER COLUMN total_bytes TYPE BIGINT"
                )
            )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_groups_table()
    _migrate_peers_table()
    _migrate_gui_settings_table()
    _migrate_initial_settings_table()
    _migrate_peer_traffic_snapshots_table()
    init_log_db()


def _b64key(num_bytes: int = 32) -> str:
    return base64.b64encode(os.urandom(num_bytes)).decode("ascii")


def generate_keypair() -> tuple[str, str]:
    private_key = x25519.X25519PrivateKey.generate()
    public_key = private_key.public_key()
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return (
        base64.b64encode(private_bytes).decode("ascii"),
        base64.b64encode(public_bytes).decode("ascii"),
    )


def get_server_state(session: Session) -> ServerState:
    server = session.get(ServerState, 1)
    if server is None:
        private_key, public_key = generate_keypair()
        server = ServerState(
            id=1,
            endpoint=settings.server_endpoint,
            listen_port=settings.server_listen_port,
            server_address=settings.server_address,
            dns=settings.server_dns,
            private_key=private_key,
            public_key=public_key,
        )
        session.add(server)
        session.commit()
        session.refresh(server)
    return server


def get_initial_settings(session: Session) -> InitialSettings:
    initial_settings = session.get(InitialSettings, 1)
    if initial_settings is None:
        initial_settings = InitialSettings(
            id=1,
            endpoint_address=settings.server_endpoint,
            endpoint_port=settings.server_listen_port,
            interface_mtu=settings.server_interface_mtu,
        )
        session.add(initial_settings)
        session.commit()
        session.refresh(initial_settings)

    server_state = get_server_state(session)
    setattr(initial_settings, "server_address", server_state.server_address)
    setattr(initial_settings, "server_dns", server_state.dns)
    return initial_settings


def update_initial_settings(
    session: Session, payload: InitialSettingsUpdate
) -> InitialSettings:
    initial_settings = get_initial_settings(session)
    initial_settings.endpoint_address = payload.endpoint_address
    initial_settings.endpoint_port = payload.endpoint_port
    initial_settings.interface_mtu = payload.interface_mtu
    initial_settings.updated_at = datetime.now(timezone.utc)

    server_state = get_server_state(session)
    if payload.server_address is not None:
        server_state.server_address = payload.server_address
    if payload.server_dns is not None:
        server_state.dns = payload.server_dns
    server_state.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(initial_settings)
    session.refresh(server_state)

    setattr(initial_settings, "server_address", server_state.server_address)
    setattr(initial_settings, "server_dns", server_state.dns)

    log_operation(
        "initial_settings.update",
        "initial_settings",
        initial_settings.id,
        source="service",
        details={
            "endpoint_address": initial_settings.endpoint_address,
            "endpoint_port": initial_settings.endpoint_port,
            "interface_mtu": initial_settings.interface_mtu,
            "server_address": server_state.server_address,
            "server_dns": server_state.dns,
        },
    )

    try:
        from app.services.apply import apply_server_config

        apply_server_config(session)
        log_operation(
            "initial_settings.apply",
            "initial_settings",
            initial_settings.id,
            source="service",
            details={
                "server_address": server_state.server_address,
                "server_dns": server_state.dns,
            },
        )
    except Exception as exc:
        log_operation(
            "initial_settings.apply_failed",
            "initial_settings",
            initial_settings.id,
            source="service",
            details={"error": str(exc)},
        )

    return initial_settings
