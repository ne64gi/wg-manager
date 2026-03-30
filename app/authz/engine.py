from __future__ import annotations

from typing import Sequence

from app.authz.contracts import AuthzContext, AuthzDecision, AuthzResource, AuthzSubject, PolicyPlugin
from app.authz.policy import BuiltinPolicyPlugin
from app.core import settings


def load_policy_plugins() -> Sequence[PolicyPlugin]:
    return [BuiltinPolicyPlugin()]


def evaluate_authorization(
    *,
    subject: AuthzSubject,
    action: str,
    resource: AuthzResource | None,
    context: AuthzContext,
) -> AuthzDecision:
    for plugin in load_policy_plugins():
        try:
            decision = plugin.authorize(subject, action, resource, context)
        except Exception:
            return AuthzDecision.DENY if settings.authz_fail_closed else AuthzDecision.ALLOW
        if decision != AuthzDecision.ABSTAIN:
            return decision

    return AuthzDecision.ALLOW if settings.authz_default_allow else AuthzDecision.DENY
