from __future__ import annotations

from app.authz.contracts import (
    AuthzContext,
    AuthzDecision,
    AuthzResource,
    AuthzSubject,
    PolicyPlugin,
)
from app.models import LoginUserRole


class BuiltinPolicyPlugin(PolicyPlugin):
    def authorize(
        self,
        subject: AuthzSubject,
        action: str,
        resource: AuthzResource | None,
        context: AuthzContext,
    ) -> AuthzDecision:
        del resource, context

        if action in {
            "settings.read",
            "settings.update",
            "login_user.list",
            "login_user.read",
            "login_user.create",
            "login_user.update",
            "login_user.delete",
            "group.create",
        }:
            if subject.role == LoginUserRole.ADMIN:
                return AuthzDecision.ALLOW
            return AuthzDecision.DENY

        if action in {
            "config.apply",
        }:
            if subject.role in {LoginUserRole.ADMIN, LoginUserRole.GROUP_ADMIN}:
                return AuthzDecision.ALLOW
            return AuthzDecision.DENY

        return AuthzDecision.ABSTAIN
