from app.core import settings
from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.schemas import AuthLoginRequest, LoginUserCreate
from app.services import (
    authenticate_access_token,
    authenticate_login,
    create_login_user,
    logout_login_session,
    refresh_login_tokens,
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
