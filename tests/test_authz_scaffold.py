from app.authz import AuthzContext, AuthzDecision, AuthzResource, AuthzSubject, authorize, evaluate_authorization
from app.authz.decorators import get_authorization_metadata
from app.core import settings


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
        subject=AuthzSubject(login_user_id=1, username="admin", is_active=True),
        action="peer.delete",
        resource=AuthzResource(resource_type="peer", resource_id=7),
        context=AuthzContext(method="DELETE", path="/peers/7", action="peer.delete"),
    )
    assert decision == AuthzDecision.ALLOW
