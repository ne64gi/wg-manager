from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core import settings
from app.models import LoginSession, LoginUser, LoginUserRole
from app.schemas.auth import (
    AuthLoginRequest,
    AuthenticatedLoginUserRead,
    AuthUpdateProfileRequest,
    TokenPairRead,
)
from app.schemas.gui import LoginUserCreate, LoginUserRead, LoginUserUpdate
from app.services.audit import log_gui_event, log_operation
from app.services.gui import create_login_user, get_gui_settings, update_login_user, verify_password


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def _sign(signing_input: bytes) -> str:
    digest = hmac.new(
        settings.jwt_secret_key.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    return _b64url_encode(digest)


def _encode_jwt(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_part = _b64url_encode(
        json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    payload_part = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = _sign(signing_input)
    return f"{header_part}.{payload_part}.{signature}"


def decode_jwt(token: str) -> dict:
    try:
        header_part, payload_part, signature = token.split(".", 2)
    except ValueError as exc:
        raise ValueError("invalid token format") from exc

    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    expected_signature = _sign(signing_input)
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("invalid token signature")

    payload = json.loads(_b64url_decode(payload_part).decode("utf-8"))
    exp = int(payload.get("exp", 0))
    if exp <= int(datetime.now(timezone.utc).timestamp()):
        raise ValueError("token has expired")
    return payload


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def resolve_login_user_role(login_user: LoginUser) -> LoginUserRole:
    return login_user.role


def resolve_login_user_group_id(login_user: LoginUser) -> int | None:
    return login_user.group_id


def build_authenticated_login_user_read(
    session: Session,
    login_user: LoginUser,
) -> AuthenticatedLoginUserRead:
    gui_settings = get_gui_settings(session)
    return AuthenticatedLoginUserRead(
        id=login_user.id,
        username=login_user.username,
        group_id=login_user.group_id,
        email=login_user.email,
        role=resolve_login_user_role(login_user),
        description=login_user.description,
        preferred_theme_mode=login_user.preferred_theme_mode or "system",
        locale=login_user.preferred_locale or gui_settings.default_locale,
        timezone=login_user.preferred_timezone or "UTC",
        avatar_url=login_user.avatar_url,
        is_active=login_user.is_active,
        last_login_at=login_user.last_login_at,
    )


def build_login_user_read(
    session: Session,
    login_user: LoginUser,
) -> LoginUserRead:
    gui_settings = get_gui_settings(session)
    return LoginUserRead(
        id=login_user.id,
        username=login_user.username,
        group_id=login_user.group_id,
        email=login_user.email,
        role=resolve_login_user_role(login_user),
        description=login_user.description,
        preferred_theme_mode=login_user.preferred_theme_mode or "system",
        locale=login_user.preferred_locale or gui_settings.default_locale,
        timezone=login_user.preferred_timezone or "UTC",
        avatar_url=login_user.avatar_url,
        is_active=login_user.is_active,
        last_login_at=login_user.last_login_at,
        created_at=login_user.created_at,
        updated_at=login_user.updated_at,
    )


def _issue_access_token(login_user: LoginUser, login_session: LoginSession) -> tuple[str, datetime]:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(
        minutes=settings.jwt_access_token_ttl_minutes
    )
    payload = {
        "sub": str(login_user.id),
        "sid": str(login_session.id),
        "typ": "access",
        "iat": int(issued_at.timestamp()),
        "jti": secrets.token_urlsafe(12),
        "exp": int(expires_at.timestamp()),
    }
    return _encode_jwt(payload), expires_at


def _issue_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def _get_active_session(
    session: Session, login_session_id: int, *, eager: bool = False
) -> LoginSession | None:
    query = select(LoginSession).where(LoginSession.id == login_session_id)
    if eager:
        query = query.options(joinedload(LoginSession.login_user))
    login_session = session.scalar(query)
    if login_session is None:
        return None

    now = datetime.now(timezone.utc)
    expires_at = _as_utc(login_session.expires_at)
    revoked_at = _as_utc(login_session.revoked_at)
    if revoked_at is not None or (expires_at is not None and expires_at <= now):
        return None
    return login_session


def authenticate_login(
    session: Session, payload: AuthLoginRequest
) -> tuple[LoginUser, TokenPairRead]:
    login_user = session.scalar(
        select(LoginUser).where(LoginUser.username == payload.username)
    )
    if login_user is None or not login_user.is_active:
        raise ValueError("invalid username or password")
    if not verify_password(payload.password, login_user.password_hash):
        raise ValueError("invalid username or password")

    now = datetime.now(timezone.utc)
    refresh_token = _issue_refresh_token()
    refresh_expires_at = now + timedelta(days=settings.jwt_refresh_token_ttl_days)
    login_session = LoginSession(
        login_user_id=login_user.id,
        refresh_token_hash=_hash_refresh_token(refresh_token),
        expires_at=refresh_expires_at,
        last_used_at=now,
    )
    session.add(login_session)
    session.flush()

    access_token, access_expires_at = _issue_access_token(login_user, login_session)
    login_user.last_login_at = now
    session.commit()
    session.refresh(login_user)
    session.refresh(login_session)

    log_operation(
        "auth.login",
        "login_user",
        login_user.id,
        source="service",
        details={"session_id": login_session.id},
    )
    log_gui_event(
        "info",
        "auth",
        "GUI login succeeded",
        login_user_id=login_user.id,
        username=login_user.username,
        details={"session_id": login_session.id},
    )

    return login_user, TokenPairRead(
        access_token=access_token,
        refresh_token=refresh_token,
        access_token_expires_at=access_expires_at,
        refresh_token_expires_at=refresh_expires_at,
    )


def refresh_login_tokens(session: Session, refresh_token: str) -> tuple[LoginUser, TokenPairRead]:
    login_session = session.scalar(
        select(LoginSession)
        .options(joinedload(LoginSession.login_user))
        .where(LoginSession.refresh_token_hash == _hash_refresh_token(refresh_token))
    )
    if login_session is None:
        raise ValueError("invalid refresh token")

    now = datetime.now(timezone.utc)
    expires_at = _as_utc(login_session.expires_at)
    revoked_at = _as_utc(login_session.revoked_at)
    if revoked_at is not None or (expires_at is not None and expires_at <= now):
        raise ValueError("refresh token has expired")
    if not login_session.login_user.is_active:
        raise ValueError("login user is inactive")

    new_refresh_token = _issue_refresh_token()
    refresh_expires_at = now + timedelta(days=settings.jwt_refresh_token_ttl_days)
    login_session.refresh_token_hash = _hash_refresh_token(new_refresh_token)
    login_session.expires_at = refresh_expires_at
    login_session.last_used_at = now
    login_session.updated_at = now

    access_token, access_expires_at = _issue_access_token(
        login_session.login_user, login_session
    )
    session.commit()
    session.refresh(login_session)
    session.refresh(login_session.login_user)

    log_operation(
        "auth.refresh",
        "login_user",
        login_session.login_user.id,
        source="service",
        details={"session_id": login_session.id},
    )

    return login_session.login_user, TokenPairRead(
        access_token=access_token,
        refresh_token=new_refresh_token,
        access_token_expires_at=access_expires_at,
        refresh_token_expires_at=refresh_expires_at,
    )


def logout_login_session(session: Session, refresh_token: str) -> None:
    login_session = session.scalar(
        select(LoginSession)
        .options(joinedload(LoginSession.login_user))
        .where(LoginSession.refresh_token_hash == _hash_refresh_token(refresh_token))
    )
    if login_session is None:
        raise ValueError("invalid refresh token")

    login_session.revoked_at = datetime.now(timezone.utc)
    login_session.updated_at = datetime.now(timezone.utc)
    session.commit()

    log_operation(
        "auth.logout",
        "login_user",
        login_session.login_user.id,
        source="service",
        details={"session_id": login_session.id},
    )
    log_gui_event(
        "info",
        "auth",
        "GUI logout completed",
        login_user_id=login_session.login_user.id,
        username=login_session.login_user.username,
        details={"session_id": login_session.id},
    )


def authenticate_access_token(session: Session, access_token: str) -> LoginUser:
    payload = decode_jwt(access_token)
    if payload.get("typ") != "access":
        raise ValueError("invalid token type")

    try:
        login_user_id = int(payload["sub"])
        login_session_id = int(payload["sid"])
    except (KeyError, ValueError) as exc:
        raise ValueError("invalid token payload") from exc

    login_session = _get_active_session(session, login_session_id, eager=True)
    if login_session is None:
        raise ValueError("login session is not active")
    if login_session.login_user_id != login_user_id:
        raise ValueError("invalid token subject")
    if not login_session.login_user.is_active:
        raise ValueError("login user is inactive")

    login_session.last_used_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(login_session.login_user)
    return login_session.login_user


def has_login_users(session: Session) -> bool:
    return session.scalar(select(LoginUser.id).limit(1)) is not None


def setup_initial_login_user(
    session: Session, username: str, password: str
) -> tuple[LoginUser, TokenPairRead]:
    if has_login_users(session):
        raise ValueError("initial login user has already been created")

    create_login_user(
        session,
        LoginUserCreate(username=username, password=password, description="", is_active=True),
    )
    return authenticate_login(session, AuthLoginRequest(username=username, password=password))


def change_login_user_password(
    session: Session, current_user: LoginUser, current_password: str, new_password: str
) -> LoginUser:
    if not verify_password(current_password, current_user.password_hash):
        raise ValueError("current password is incorrect")

    return update_login_user(
        session,
        current_user.id,
        LoginUserUpdate(password=new_password),
    )


def update_own_login_user_profile(
    session: Session,
    current_user: LoginUser,
    payload: AuthUpdateProfileRequest,
) -> LoginUser:
    return update_login_user(
        session,
        current_user.id,
        LoginUserUpdate(
            email=payload.email,
            description=payload.description,
            preferred_theme_mode=payload.preferred_theme_mode,
            preferred_locale=payload.preferred_locale,
            preferred_timezone=payload.preferred_timezone,
            avatar_url=payload.avatar_url,
        ),
    )
