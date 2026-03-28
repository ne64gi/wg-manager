from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GeneratedPeerArtifacts(BaseModel):
    peer_id: int
    peer_name: str
    config_path: str
    qr_path: str
    last_config_generated_at: datetime


class RevealedPeerArtifacts(BaseModel):
    peer_id: int
    peer_name: str
    config_text: str
    qr_svg: str
    revealed_at: datetime


class BundleWarningRead(BaseModel):
    message: str
    peer_count: int
    requires_reissue: bool = True


class GeneratedServerArtifacts(BaseModel):
    server_config_path: str
    peer_count: int


class ServerConfigPreview(BaseModel):
    current_config_text: str
    candidate_config_text: str
    unified_diff: str
    has_changes: bool
    peer_count: int
    current_line_count: int
    candidate_line_count: int
    changed_line_count: int


class ApplyResult(BaseModel):
    server_config_path: str
    peer_count: int
    runtime_adapter: str
    interface_name: str
    applied_at: datetime


class ServerStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    endpoint: str
    listen_port: int
    server_address: str
    dns: list[str]
    public_key: str
