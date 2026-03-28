from __future__ import annotations

import base64
import hashlib
import hmac
import os
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import settings
from app.models import GuiSettings, LoginUser
from app.schemas.gui import GuiSettingsUpdate, LoginUserCreate, LoginUserUpdate
from app.services.audit import log_gui_event, log_operation


def _pbkdf2_hash(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 390000).hex()


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = _pbkdf2_hash(password, salt)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode('ascii')}${digest}"


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, salt_b64, digest = encoded_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    candidate = _pbkdf2_hash(password, base64.b64decode(salt_b64.encode("ascii")))
    return hmac.compare_digest(candidate, digest)


def get_gui_settings(session: Session) -> GuiSettings:
    gui_settings = session.get(GuiSettings, 1)
    if gui_settings is None:
        gui_settings = GuiSettings(id=1)
        session.add(gui_settings)
        session.commit()
        session.refresh(gui_settings)
    return gui_settings


def update_gui_settings(session: Session, payload: GuiSettingsUpdate) -> GuiSettings:
    gui_settings = get_gui_settings(session)
    if payload.theme_mode is not None:
        gui_settings.theme_mode = payload.theme_mode
    if payload.default_locale is not None:
        gui_settings.default_locale = payload.default_locale
    if payload.overview_refresh_seconds is not None:
        gui_settings.overview_refresh_seconds = payload.overview_refresh_seconds
    if payload.peers_refresh_seconds is not None:
        gui_settings.peers_refresh_seconds = payload.peers_refresh_seconds
    if payload.traffic_snapshot_interval_seconds is not None:
        gui_settings.traffic_snapshot_interval_seconds = (
            payload.traffic_snapshot_interval_seconds
        )
    if payload.traffic_snapshot_retention_days is not None:
        gui_settings.traffic_snapshot_retention_days = (
            payload.traffic_snapshot_retention_days
        )
    if payload.refresh_after_apply is not None:
        gui_settings.refresh_after_apply = payload.refresh_after_apply
    if payload.online_threshold_seconds is not None:
        gui_settings.online_threshold_seconds = payload.online_threshold_seconds
    if payload.error_log_level is not None:
        gui_settings.error_log_level = payload.error_log_level
    if payload.access_log_path is not None:
        gui_settings.access_log_path = payload.access_log_path
    if payload.error_log_path is not None:
        gui_settings.error_log_path = payload.error_log_path
    gui_settings.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(gui_settings)
    log_operation(
        "gui_settings.update",
        "gui_settings",
        gui_settings.id,
        source="service",
        details={
            "theme_mode": gui_settings.theme_mode,
            "default_locale": gui_settings.default_locale,
            "overview_refresh_seconds": gui_settings.overview_refresh_seconds,
            "peers_refresh_seconds": gui_settings.peers_refresh_seconds,
            "traffic_snapshot_interval_seconds": gui_settings.traffic_snapshot_interval_seconds,
            "traffic_snapshot_retention_days": gui_settings.traffic_snapshot_retention_days,
            "refresh_after_apply": gui_settings.refresh_after_apply,
            "online_threshold_seconds": gui_settings.online_threshold_seconds,
            "error_log_level": gui_settings.error_log_level,
            "access_log_path": gui_settings.access_log_path,
            "error_log_path": gui_settings.error_log_path,
        },
    )
    log_gui_event(
        "info",
        "settings",
        "GUI settings updated",
        details={
            "theme_mode": gui_settings.theme_mode,
            "default_locale": gui_settings.default_locale,
            "overview_refresh_seconds": gui_settings.overview_refresh_seconds,
            "peers_refresh_seconds": gui_settings.peers_refresh_seconds,
            "traffic_snapshot_interval_seconds": gui_settings.traffic_snapshot_interval_seconds,
            "traffic_snapshot_retention_days": gui_settings.traffic_snapshot_retention_days,
            "refresh_after_apply": gui_settings.refresh_after_apply,
            "online_threshold_seconds": gui_settings.online_threshold_seconds,
            "error_log_level": gui_settings.error_log_level,
            "access_log_path": gui_settings.access_log_path,
            "error_log_path": gui_settings.error_log_path,
        },
    )
    return gui_settings


def list_login_users(session: Session) -> list[LoginUser]:
    return list(session.scalars(select(LoginUser).order_by(LoginUser.username)))


def get_login_user(session: Session, login_user_id: int) -> LoginUser | None:
    return session.get(LoginUser, login_user_id)


def create_login_user(session: Session, payload: LoginUserCreate) -> LoginUser:
    existing = session.scalar(
        select(LoginUser).where(LoginUser.username == payload.username)
    )
    if existing:
        raise ValueError(f"login user '{payload.username}' already exists")

    login_user = LoginUser(
        username=payload.username,
        password_hash=hash_password(payload.password),
        description=payload.description,
        is_active=payload.is_active,
    )
    session.add(login_user)
    session.commit()
    session.refresh(login_user)
    log_operation(
        "login_user.create",
        "login_user",
        login_user.id,
        source="service",
        details={
            "username": login_user.username,
            "is_active": login_user.is_active,
        },
    )
    log_gui_event(
        "info",
        "auth",
        "GUI login user created",
        login_user_id=login_user.id,
        username=login_user.username,
    )
    return login_user


def update_login_user(
    session: Session, login_user_id: int, payload: LoginUserUpdate
) -> LoginUser:
    login_user = session.get(LoginUser, login_user_id)
    if login_user is None:
        raise ValueError(f"login user id={login_user_id} does not exist")

    if payload.password is not None:
        login_user.password_hash = hash_password(payload.password)
    if payload.description is not None:
        login_user.description = payload.description
    if payload.is_active is not None:
        login_user.is_active = payload.is_active
    login_user.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(login_user)
    log_operation(
        "login_user.update",
        "login_user",
        login_user.id,
        source="service",
        details={
            "username": login_user.username,
            "is_active": login_user.is_active,
            "description": login_user.description,
            "password_updated": payload.password is not None,
        },
    )
    return login_user


def delete_login_user(session: Session, login_user_id: int) -> None:
    login_user = session.get(LoginUser, login_user_id)
    if login_user is None:
        raise ValueError(f"login user id={login_user_id} does not exist")

    username = login_user.username
    entity_id = login_user.id
    session.delete(login_user)
    session.commit()
    log_operation(
        "login_user.delete",
        "login_user",
        entity_id,
        source="service",
        details={"username": username},
    )
    log_gui_event(
        "warning",
        "auth",
        "GUI login user deleted",
        login_user_id=entity_id,
        username=username,
    )


def bootstrap_login_user(session: Session) -> LoginUser | None:
    username = settings.bootstrap_admin_username
    password = settings.bootstrap_admin_password
    if not username or not password:
        return None

    existing = session.scalar(
        select(LoginUser).where(LoginUser.username == username)
    )
    if existing is not None:
        return existing

    login_user = LoginUser(
        username=username,
        password_hash=hash_password(password),
        description="Bootstrapped from environment",
        is_active=True,
    )
    session.add(login_user)
    session.commit()
    session.refresh(login_user)
    log_operation(
        "login_user.bootstrap",
        "login_user",
        login_user.id,
        source="startup",
        details={"username": login_user.username},
    )
    log_gui_event(
        "info",
        "auth",
        "GUI bootstrap login user created",
        login_user_id=login_user.id,
        username=login_user.username,
    )
    session.commit()
    return login_user
