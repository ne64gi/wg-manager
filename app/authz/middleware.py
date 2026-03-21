from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.routing import Match

from app.authz.contracts import AuthzContext, AuthzDecision, AuthzResource, AuthzSubject
from app.authz.decorators import get_authorization_metadata
from app.authz.engine import evaluate_authorization
from app.core import settings
from app.db import SessionLocal
from app.services import authenticate_access_token


class AuthorizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable]
    ):
        if not settings.authz_enabled:
            return await call_next(request)
        if request.method.upper() == "OPTIONS":
            return await call_next(request)

        resolved = _resolve_route_metadata(request)
        if resolved is None:
            return await call_next(request)

        route_path, path_params, metadata = resolved
        if metadata is not None and metadata.public:
            return await call_next(request)

        credentials = request.headers.get("authorization", "")
        if not credentials.lower().startswith("bearer "):
            return await call_next(request)
        token = credentials.split(" ", 1)[1].strip()
        if not token:
            return await call_next(request)

        try:
            with SessionLocal() as session:
                login_user = authenticate_access_token(session, token)
        except Exception:
            return await call_next(request)

        action = metadata.action if metadata is not None else f"{request.method.lower()} {route_path}"
        resource = AuthzResource(
            resource_type=metadata.resource_type if metadata is not None else None,
            resource_id=path_params.get(metadata.resource_id_param) if metadata and metadata.resource_id_param else None,
            metadata={"route_path": route_path},
        )
        context = AuthzContext(
            method=request.method,
            path=str(request.url.path),
            route_path=route_path,
            action=action,
            path_params=path_params,
            query_params=dict(request.query_params),
        )
        subject = AuthzSubject(
            login_user_id=login_user.id,
            username=login_user.username,
            is_active=login_user.is_active,
        )
        decision = evaluate_authorization(
            subject=subject,
            action=action,
            resource=resource,
            context=context,
        )
        if decision == AuthzDecision.DENY:
            return JSONResponse(status_code=403, content={"detail": "authorization denied"})
        return await call_next(request)


def _resolve_route_metadata(request: Request):
    for route in request.app.router.routes:
        match, child_scope = route.matches(request.scope)
        if match != Match.FULL:
            continue
        endpoint = getattr(route, "endpoint", None)
        metadata = get_authorization_metadata(endpoint)
        return getattr(route, "path", None), child_scope.get("path_params", {}), metadata
    return None

