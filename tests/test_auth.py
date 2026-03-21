from app.core import settings
from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.schemas import AuthLoginRequest, LoginUserCreate
from app.services import (
    authenticate_access_token,
    authenticate_login,
    change_login_user_password,
    create_login_user,
    has_login_users,
    logout_login_session,
    refresh_login_tokens,
    setup_initial_login_user,
)
from app.services.auth import decode_jwt


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def test_jwt_login_refresh_and_logout(monkeypatch) -> None:
    reset_db()
    monkeypatch.setattr(settings, "jwt_secret_key", "test-secret-key")
    monkeypatch.setattr(settings, "jwt_access_token_ttl_minutes", 15)
    monkeypatch.setattr(settings, "jwt_refresh_token_ttl_days", 30)

    with SessionLocal() as session:
        login_user = create_login_user(
            session,
            LoginUserCreate(
                username="admin",
                password="supersecret123",
                description="admin user",
            ),
        )

        authenticated_user, token_pair = authenticate_login(
            session,
            AuthLoginRequest(username="admin", password="supersecret123"),
        )
        assert authenticated_user.id == login_user.id
        assert token_pair.token_type == "bearer"

        payload = decode_jwt(token_pair.access_token)
        assert payload["sub"] == str(login_user.id)
        assert payload["typ"] == "access"

        current_user = authenticate_access_token(session, token_pair.access_token)
        assert current_user.id == login_user.id

        refreshed_user, refreshed_pair = refresh_login_tokens(
            session, token_pair.refresh_token
        )
        assert refreshed_user.id == login_user.id
        assert refreshed_pair.refresh_token != token_pair.refresh_token
        assert refreshed_pair.access_token != token_pair.access_token

        logout_login_session(session, refreshed_pair.refresh_token)

        try:
            authenticate_access_token(session, refreshed_pair.access_token)
        except ValueError as exc:
            assert "not active" in str(exc)
        else:
            raise AssertionError("expected revoked session to reject access token")

        try:
            refresh_login_tokens(session, refreshed_pair.refresh_token)
        except ValueError as exc:
            assert "expired" in str(exc)
        else:
            raise AssertionError("expected revoked refresh token to be rejected")


def test_initial_setup_and_password_change(monkeypatch) -> None:
    reset_db()
    monkeypatch.setattr(settings, "jwt_secret_key", "test-secret-key")

    with SessionLocal() as session:
        assert has_login_users(session) is False

        login_user, token_pair = setup_initial_login_user(
            session,
            "setup-admin",
            "supersecret123",
        )
        assert login_user.username == "setup-admin"
        assert token_pair.access_token
        assert has_login_users(session) is True

        updated_user = change_login_user_password(
            session,
            login_user,
            "supersecret123",
            "newsecret123",
        )
        assert updated_user.id == login_user.id

        authenticated_user, _ = authenticate_login(
            session,
            AuthLoginRequest(username="setup-admin", password="newsecret123"),
        )
        assert authenticated_user.id == login_user.id

        try:
            setup_initial_login_user(session, "second-admin", "anothersecret123")
        except ValueError as exc:
            assert "already been created" in str(exc)
        else:
            raise AssertionError("expected setup to reject when users already exist")
