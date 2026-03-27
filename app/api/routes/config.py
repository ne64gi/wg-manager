from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.authz import authorize
from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.schemas.config import (
    ApplyResult,
    BundleWarningRead,
    GeneratedPeerArtifacts,
    GeneratedServerArtifacts,
    RevealedPeerArtifacts,
)
from app.services import (
    apply_server_config,
    build_group_peer_bundle,
    build_user_peer_bundle,
    generate_peer_artifacts,
    generate_server_config,
    get_group_bundle_warning,
    get_or_generate_peer_config_text,
    get_or_generate_peer_qr_svg,
    get_user_bundle_warning,
    reveal_peer_artifacts,
)

router = APIRouter()


@router.post("/config/peers/{peer_id}/generate", response_model=GeneratedPeerArtifacts)
@authorize(action="peer.generate_artifacts", resource_type="peer", resource_id_param="peer_id")
def generate_peer_config_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GeneratedPeerArtifacts:
    try:
        return generate_peer_artifacts(session, peer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/config/peers/{peer_id}/reveal", response_model=RevealedPeerArtifacts)
@authorize(action="peer.reveal", resource_type="peer", resource_id_param="peer_id")
def reveal_peer_artifacts_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> RevealedPeerArtifacts:
    try:
        return reveal_peer_artifacts(session, peer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.get("/config/groups/{group_id}/bundle-warning", response_model=BundleWarningRead)
@authorize(action="group.bundle_warning", resource_type="group", resource_id_param="group_id")
def get_group_bundle_warning_endpoint(
    group_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> BundleWarningRead:
    try:
        return get_group_bundle_warning(session, group_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/config/groups/{group_id}/bundle", response_class=Response)
@authorize(action="group.bundle_download", resource_type="group", resource_id_param="group_id")
def download_group_bundle_endpoint(
    group_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> Response:
    try:
        bundle_bytes, filename = build_group_peer_bundle(session, group_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=bundle_bytes, media_type="application/zip", headers=headers)


@router.get("/config/users/{user_id}/bundle-warning", response_model=BundleWarningRead)
@authorize(action="user.bundle_warning", resource_type="user", resource_id_param="user_id")
def get_user_bundle_warning_endpoint(
    user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> BundleWarningRead:
    try:
        return get_user_bundle_warning(session, user_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/config/users/{user_id}/bundle", response_class=Response)
@authorize(action="user.bundle_download", resource_type="user", resource_id_param="user_id")
def download_user_bundle_endpoint(
    user_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> Response:
    try:
        bundle_bytes, filename = build_user_peer_bundle(session, user_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=bundle_bytes, media_type="application/zip", headers=headers)


@router.get("/config/peers/{peer_id}", response_class=Response)
@authorize(action="peer.read_direct_config", resource_type="peer", resource_id_param="peer_id")
def get_peer_config_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> Response:
    raise HTTPException(
        status_code=410,
        detail="direct peer config retrieval is disabled; use /config/peers/{peer_id}/reveal",
    )


@router.get("/config/peers/{peer_id}/qr", response_class=Response)
@authorize(action="peer.read_direct_qr", resource_type="peer", resource_id_param="peer_id")
def get_peer_qr_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> Response:
    raise HTTPException(
        status_code=410,
        detail="direct peer QR retrieval is disabled; use /config/peers/{peer_id}/reveal",
    )


@router.post("/config/server/generate", response_model=GeneratedServerArtifacts)
@authorize(action="config.generate_server", resource_type="server_config")
def generate_server_config_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> GeneratedServerArtifacts:
    return generate_server_config(session)


@router.post("/config/server/apply", response_model=ApplyResult)
@authorize(action="config.apply", resource_type="server_config")
def apply_server_config_endpoint(
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> ApplyResult:
    try:
        return apply_server_config(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
