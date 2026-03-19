from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import require_authenticated_login_user
from app.db import get_session
from app.models import LoginUser
from app.schemas import (
    ApplyResult,
    GeneratedPeerArtifacts,
    GeneratedServerArtifacts,
    RevealedPeerArtifacts,
)
from app.services import (
    apply_server_config,
    generate_peer_artifacts,
    generate_server_config,
    get_or_generate_peer_config_text,
    get_or_generate_peer_qr_svg,
    reveal_peer_artifacts,
)

router = APIRouter()


@router.post("/config/peers/{peer_id}/generate", response_model=GeneratedPeerArtifacts)
def generate_peer_config_endpoint(
    peer_id: int, session: Session = Depends(get_session)
) -> GeneratedPeerArtifacts:
    try:
        return generate_peer_artifacts(session, peer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/config/peers/{peer_id}/reveal", response_model=RevealedPeerArtifacts)
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


@router.get("/config/peers/{peer_id}", response_class=Response)
def get_peer_config_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> Response:
    try:
        peer, contents = get_or_generate_peer_config_text(session, peer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return Response(
        content=contents,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="{peer.name}.conf"'},
    )


@router.get("/config/peers/{peer_id}/qr", response_class=Response)
def get_peer_qr_endpoint(
    peer_id: int,
    current_user: LoginUser = Depends(require_authenticated_login_user),
    session: Session = Depends(get_session),
) -> Response:
    try:
        peer, contents = get_or_generate_peer_qr_svg(session, peer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "does not exist" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    return Response(
        content=contents,
        media_type="image/svg+xml",
        headers={"Content-Disposition": f'inline; filename="{peer.name}.svg"'},
    )


@router.post("/config/server/generate", response_model=GeneratedServerArtifacts)
def generate_server_config_endpoint(
    session: Session = Depends(get_session),
) -> GeneratedServerArtifacts:
    return generate_server_config(session)


@router.post("/config/server/apply", response_model=ApplyResult)
def apply_server_config_endpoint(
    session: Session = Depends(get_session),
) -> ApplyResult:
    try:
        return apply_server_config(session)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
