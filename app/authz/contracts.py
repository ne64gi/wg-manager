from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol

from app.models import LoginUserRole


class AuthzDecision(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    ABSTAIN = "abstain"


@dataclass(slots=True)
class AuthzSubject:
    login_user_id: int
    username: str
    role: LoginUserRole
    is_active: bool
    group_id: int | None = None


@dataclass(slots=True)
class AuthzResource:
    resource_type: str | None = None
    resource_id: str | int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class AuthzContext:
    method: str
    path: str
    route_path: str | None = None
    action: str | None = None
    path_params: dict[str, Any] = field(default_factory=dict)
    query_params: dict[str, Any] = field(default_factory=dict)


class PolicyPlugin(Protocol):
    def authorize(
        self,
        subject: AuthzSubject,
        action: str,
        resource: AuthzResource | None,
        context: AuthzContext,
    ) -> AuthzDecision:
        ...
