from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


AUTHZ_METADATA_ATTR = "__wg_studio_authz_metadata__"


@dataclass(frozen=True, slots=True)
class AuthorizationMetadata:
    action: str
    resource_type: str | None = None
    resource_id_param: str | None = None
    public: bool = False


def authorize(
    *,
    action: str,
    resource_type: str | None = None,
    resource_id_param: str | None = None,
    public: bool = False,
) -> Callable:
    def decorator(func: Callable) -> Callable:
        setattr(
            func,
            AUTHZ_METADATA_ATTR,
            AuthorizationMetadata(
                action=action,
                resource_type=resource_type,
                resource_id_param=resource_id_param,
                public=public,
            ),
        )
        return func

    return decorator


def get_authorization_metadata(func: Callable | None) -> AuthorizationMetadata | None:
    if func is None:
        return None
    return getattr(func, AUTHZ_METADATA_ATTR, None)

