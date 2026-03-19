from __future__ import annotations

import ipaddress
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import GroupScope


def normalize_network(value: str) -> str:
    return str(ipaddress.ip_network(value, strict=True))


def normalize_ip(value: str) -> str:
    return str(ipaddress.ip_address(value))


def normalize_ip_list(values: list[str]) -> list[str]:
    normalized = []
    for value in values:
        try:
            normalized.append(str(ipaddress.ip_network(value, strict=False)))
            continue
        except ValueError:
            pass

        normalized.append(normalize_ip(value))
    return normalized


def normalize_address_list(values: list[str]) -> list[str]:
    return sorted({normalize_ip(value) for value in values})


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    scope: GroupScope
    network_cidr: str
    default_allowed_ips: list[str]
    dns_servers: list[str] | None = None
    allocation_start_host: int = 1
    reserved_ips: list[str] = Field(default_factory=list)
    description: str = ""
    is_active: bool = True

    @field_validator("network_cidr")
    @classmethod
    def validate_network(cls, value: str) -> str:
        return normalize_network(value)

    @field_validator("default_allowed_ips")
    @classmethod
    def validate_default_allowed_ips(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("default_allowed_ips must contain at least one route")
        return normalize_ip_list(value)

    @field_validator("reserved_ips")
    @classmethod
    def validate_reserved_ips(cls, value: list[str]) -> list[str]:
        return normalize_address_list(value)

    @field_validator("dns_servers")
    @classmethod
    def validate_dns_servers(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("dns_servers cannot be empty")
        return normalize_address_list(value)

    @field_validator("allocation_start_host")
    @classmethod
    def validate_allocation_start_host(cls, value: int) -> int:
        if value < 1:
            raise ValueError("allocation_start_host must be >= 1")
        return value

    @model_validator(mode="after")
    def validate_group_settings(self) -> "GroupCreate":
        network = ipaddress.ip_network(self.network_cidr, strict=True)
        if network.prefixlen != self.scope.required_prefix:
            raise ValueError(
                f"{self.scope.value} groups must use /{self.scope.required_prefix}"
            )

        host_count = network.num_addresses - 2
        if self.allocation_start_host > host_count:
            raise ValueError(
                f"allocation_start_host must be <= host count ({host_count})"
            )

        for ip in self.reserved_ips:
            if ipaddress.ip_address(ip) not in network:
                raise ValueError(f"reserved ip '{ip}' is outside group network")

        return self


class GroupAllocationUpdate(BaseModel):
    allocation_start_host: int = 1
    reserved_ips: list[str] = Field(default_factory=list)

    @field_validator("reserved_ips")
    @classmethod
    def validate_reserved_ips(cls, value: list[str]) -> list[str]:
        return normalize_address_list(value)

    @field_validator("allocation_start_host")
    @classmethod
    def validate_allocation_start_host(cls, value: int) -> int:
        if value < 1:
            raise ValueError("allocation_start_host must be >= 1")
        return value


class GroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    scope: GroupScope
    network_cidr: str
    default_allowed_ips: list[str]
    dns_servers: list[str] | None
    allocation_start_host: int
    reserved_ips: list[str]
    description: str
    is_active: bool


class UserCreate(BaseModel):
    group_id: int
    name: str = Field(min_length=1, max_length=100)
    allowed_ips_override: list[str] | None = None
    description: str = ""
    is_active: bool = True

    @field_validator("allowed_ips_override")
    @classmethod
    def validate_allowed_ips_override(
        cls, value: list[str] | None
    ) -> list[str] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("allowed_ips_override cannot be empty")
        return normalize_ip_list(value)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    name: str
    allowed_ips_override: list[str] | None
    description: str
    is_active: bool


class PeerCreate(BaseModel):
    user_id: int
    name: str = Field(min_length=1, max_length=100)
    assigned_ip: str | None = None
    description: str = ""
    is_active: bool = True

    @field_validator("assigned_ip")
    @classmethod
    def validate_assigned_ip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_ip(value)


class PeerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    assigned_ip: str
    public_key: str | None
    description: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    revoked_at: datetime | None
    last_config_generated_at: datetime | None


class GeneratedPeerArtifacts(BaseModel):
    peer_id: int
    peer_name: str
    config_path: str
    qr_path: str
    last_config_generated_at: datetime


class GeneratedServerArtifacts(BaseModel):
    server_config_path: str
    peer_count: int


class ApplyResult(BaseModel):
    server_config_path: str
    peer_count: int
    container_name: str
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


class PeerResolvedAccess(BaseModel):
    peer_id: int
    peer_name: str
    assigned_ip: str
    user_id: int
    user_name: str
    group_id: int
    group_name: str
    group_scope: GroupScope
    group_network_cidr: str
    effective_allowed_ips: list[str]

