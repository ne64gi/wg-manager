import asyncio
import json

from app.authz import AuthzContext, AuthzDecision, AuthzResource, AuthzSubject, authorize, evaluate_authorization
from app.authz.decorators import get_authorization_metadata
from app.authz.middleware import AuthorizationMiddleware
from app.api.main import app
from app.core import settings
from app.db import AuditBase, Base, SessionLocal, audit_engine, engine
from app.models import LoginUserRole
from app.schemas import AuthLoginRequest, LoginUserCreate
from app.services import authenticate_login, create_login_user, get_gui_settings, list_gui_logs
from starlette.requests import Request


def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    AuditBase.metadata.drop_all(bind=audit_engine)
    AuditBase.metadata.create_all(bind=audit_engine)


def build_request(
    path: str,
    *,
    method: str = "POST",
    authorization: str | None = None,
) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if authorization is not None:
        headers.append((b"authorization", authorization.encode("latin-1")))
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": headers,
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "root_path": "",
        "app": app,
    }
    return Request(scope)


async def invoke_middleware(request: Request):
    middleware = AuthorizationMiddleware(app)

    async def call_next(_: Request):
        raise AssertionError("call_next should not be reached for rejected requests")

    return await middleware.dispatch(request, call_next)


def test_authorize_decorator_attaches_metadata() -> None:
    @authorize(action="peer.delete", resource_type="peer", resource_id_param="peer_id")
    def sample() -> None:
        return None

    metadata = get_authorization_metadata(sample)
    assert metadata is not None
    assert metadata.action == "peer.delete"
    assert metadata.resource_type == "peer"
    assert metadata.resource_id_param == "peer_id"
    assert metadata.public is False


def test_evaluate_authorization_defaults_allow_for_v1_scaffold(monkeypatch) -> None:
    monkeypatch.setattr(settings, "authz_default_allow", True)
    monkeypatch.setattr(settings, "authz_fail_closed", False)

    decision = evaluate_authorization(
        subject=AuthzSubject(
            login_user_id=1,
            username="admin",
            role=LoginUserRole.ADMIN,
            group_id=None,
            is_active=True,
        ),
        action="peer.delete",
        resource=AuthzResource(resource_type="peer", resource_id=7),
        context=AuthzContext(method="DELETE", path="/peers/7", action="peer.delete"),
    )
    assert decision == AuthzDecision.ALLOW


def test_config_apply_is_allowed_for_admin_and_group_admin() -> None:
    admin_decision = evaluate_authorization(
        subject=AuthzSubject(
            login_user_id=1,
            username="admin",
            role=LoginUserRole.ADMIN,
            group_id=None,
            is_active=True,
        ),
        action="config.apply",
        resource=AuthzResource(resource_type="server_config"),
        context=AuthzContext(method="POST", path="/config/server/apply", action="config.apply"),
    )
    assert admin_decision == AuthzDecision.ALLOW

    group_admin_decision = evaluate_authorization(
        subject=AuthzSubject(
            login_user_id=2,
            username="group-admin",
            role=LoginUserRole.GROUP_ADMIN,
            group_id=17,
            is_active=True,
        ),
        action="config.apply",
        resource=AuthzResource(resource_type="server_config"),
        context=AuthzContext(method="POST", path="/config/server/apply", action="config.apply"),
    )
    assert group_admin_decision == AuthzDecision.ALLOW


def test_login_user_management_is_admin_only() -> None:
    for action in [
        "login_user.list",
        "login_user.read",
        "login_user.create",
        "login_user.update",
        "login_user.delete",
    ]:
        admin_decision = evaluate_authorization(
            subject=AuthzSubject(
                login_user_id=1,
                username="admin",
                role=LoginUserRole.ADMIN,
                group_id=None,
                is_active=True,
            ),
            action=action,
            resource=AuthzResource(resource_type="login_user", resource_id=7),
            context=AuthzContext(method="GET", path="/gui/login-users", action=action),
        )
        assert admin_decision == AuthzDecision.ALLOW

        group_admin_decision = evaluate_authorization(
            subject=AuthzSubject(
                login_user_id=2,
                username="group-admin",
                role=LoginUserRole.GROUP_ADMIN,
                group_id=17,
                is_active=True,
            ),
            action=action,
            resource=AuthzResource(resource_type="login_user", resource_id=7),
            context=AuthzContext(method="GET", path="/gui/login-users", action=action),
        )
        assert group_admin_decision == AuthzDecision.DENY


def test_service_level_settings_and_group_create_are_admin_only() -> None:
    for action in ["settings.read", "settings.update", "group.create"]:
        admin_decision = evaluate_authorization(
            subject=AuthzSubject(
                login_user_id=1,
                username="admin",
                role=LoginUserRole.ADMIN,
                group_id=None,
                is_active=True,
            ),
            action=action,
            resource=AuthzResource(resource_type="initial_settings"),
            context=AuthzContext(method="GET", path="/initial-settings", action=action),
        )
        assert admin_decision == AuthzDecision.ALLOW

        group_admin_decision = evaluate_authorization(
            subject=AuthzSubject(
                login_user_id=2,
                username="group-admin",
                role=LoginUserRole.GROUP_ADMIN,
                group_id=17,
                is_active=True,
            ),
            action=action,
            resource=AuthzResource(resource_type="initial_settings"),
            context=AuthzContext(method="GET", path="/initial-settings", action=action),
        )
        assert group_admin_decision == AuthzDecision.DENY


def test_authz_middleware_rejects_missing_credentials_and_logs_warning(monkeypatch) -> None:
    reset_db()
    monkeypatch.setattr(settings, "authz_enabled", True)

    response = asyncio.run(invoke_middleware(build_request("/config/server/apply")))

    assert response.status_code == 401
    assert json.loads(response.body) == {"detail": "authentication required"}

    gui_logs = list_gui_logs(limit=20)
    assert any(
        entry.message == "authentication required"
        and entry.category == "authz"
        and entry.status_code == 401
        for entry in gui_logs
    )


def test_authz_middleware_rejects_group_admin_service_settings(monkeypatch) -> None:
    reset_db()
    monkeypatch.setattr(settings, "authz_enabled", True)
    monkeypatch.setattr(settings, "jwt_secret_key", "test-secret-key")

    with SessionLocal() as session:
        gui_settings = get_gui_settings(session)
        gui_settings.default_locale = "en"
        session.commit()

        create_login_user(
            session,
            LoginUserCreate(
                username="group-admin",
                password="supersecret123",
                description="seed user",
            ),
        )
        _, token_pair = authenticate_login(
            session,
            AuthLoginRequest(username="group-admin", password="supersecret123"),
        )

    monkeypatch.setattr(
        "app.authz.middleware.resolve_login_user_role",
        lambda login_user: LoginUserRole.GROUP_ADMIN,
    )
    monkeypatch.setattr(
        "app.authz.middleware.resolve_login_user_group_id",
        lambda login_user: 17,
    )

    response = asyncio.run(
        invoke_middleware(
                build_request(
                    "/initial-settings",
                    method="GET",
                    authorization=f"Bearer {token_pair.access_token}",
                )
        )
    )

    assert response.status_code == 403
    assert json.loads(response.body) == {"detail": "authorization denied"}

    gui_logs = list_gui_logs(limit=20)
    denied_entries = [
        entry for entry in gui_logs if entry.category == "authz" and entry.status_code == 403
    ]
    assert denied_entries
    assert denied_entries[0].message == "authorization denied"
    assert denied_entries[0].details["action"] == "settings.read"
    assert denied_entries[0].details["reason"] == "admin_only"
