from __future__ import annotations

import json
from urllib import error, request

import typer

from app.core import settings
from app.db import SessionLocal
from app.models import GroupScope
from app.schemas import GroupAllocationUpdate, GroupCreate, PeerCreate, UserCreate
from app.services import (
    create_group,
    create_peer,
    create_user,
    delete_group,
    delete_peer,
    delete_user,
    init_db,
    list_groups,
    list_peers,
    list_users,
    revoke_peer,
    resolve_peer_access,
    update_group_allocation,
)

app = typer.Typer(help="WireGuard control plane CLI")
group_app = typer.Typer()
user_app = typer.Typer()
peer_app = typer.Typer()
config_app = typer.Typer()

app.add_typer(group_app, name="group")
app.add_typer(user_app, name="user")
app.add_typer(peer_app, name="peer")
app.add_typer(config_app, name="config")


@app.callback()
def main() -> None:
    init_db()


def print_json(payload: object) -> None:
    typer.echo(json.dumps(payload, indent=2, ensure_ascii=False, default=str))


def api_request(method: str, path: str) -> object:
    target = f"{settings.api_base_url.rstrip('/')}{path}"
    http_request = request.Request(
        target,
        method=method,
        headers={"Accept": "application/json"},
    )
    try:
        with request.urlopen(http_request) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise typer.BadParameter(
            f"API request failed ({exc.code}): {detail}"
        ) from exc
    except error.URLError as exc:
        raise typer.BadParameter(
            f"could not reach API at {settings.api_base_url}: {exc.reason}"
        ) from exc

    if not raw:
        return {}
    return json.loads(raw)


@app.command("init-db")
def init_db_command() -> None:
    init_db()
    typer.echo("database initialized")


@group_app.command("create")
def group_create_command(
    name: str = typer.Option(...),
    scope: GroupScope = typer.Option(...),
    network: str = typer.Option(..., "--network"),
    allowed_ip: list[str] = typer.Option(..., "--allowed-ip"),
    allocation_start_host: int = typer.Option(1, "--allocation-start-host"),
    reserve_ip: list[str] = typer.Option([], "--reserve-ip"),
    description: str = typer.Option("", "--description"),
) -> None:
    payload = GroupCreate(
        name=name,
        scope=scope,
        network_cidr=network,
        default_allowed_ips=allowed_ip,
        allocation_start_host=allocation_start_host,
        reserved_ips=reserve_ip,
        description=description,
    )
    with SessionLocal() as session:
        group = create_group(session, payload)
        print_json(
            {
                "id": group.id,
                "name": group.name,
                "scope": group.scope,
                "network_cidr": group.network_cidr,
                "default_allowed_ips": group.default_allowed_ips,
                "allocation_start_host": group.allocation_start_host,
                "reserved_ips": group.reserved_ips,
            }
        )


@group_app.command("update-allocation")
def group_update_allocation_command(
    group_id: int = typer.Option(..., "--group-id"),
    allocation_start_host: int = typer.Option(1, "--allocation-start-host"),
    reserve_ip: list[str] = typer.Option([], "--reserve-ip"),
) -> None:
    payload = GroupAllocationUpdate(
        allocation_start_host=allocation_start_host,
        reserved_ips=reserve_ip,
    )
    with SessionLocal() as session:
        group = update_group_allocation(session, group_id, payload)
        print_json(
            {
                "id": group.id,
                "name": group.name,
                "allocation_start_host": group.allocation_start_host,
                "reserved_ips": group.reserved_ips,
            }
        )


@group_app.command("list")
def group_list_command() -> None:
    with SessionLocal() as session:
        groups = list_groups(session)
        print_json(
            [
                {
                    "id": group.id,
                    "name": group.name,
                    "scope": group.scope,
                    "network_cidr": group.network_cidr,
                    "default_allowed_ips": group.default_allowed_ips,
                    "allocation_start_host": group.allocation_start_host,
                    "reserved_ips": group.reserved_ips,
                    "is_active": group.is_active,
                }
                for group in groups
            ]
        )


@group_app.command("delete")
def group_delete_command(group_id: int = typer.Option(..., "--group-id")) -> None:
    with SessionLocal() as session:
        delete_group(session, group_id)
        typer.echo(f"group {group_id} deleted")


@user_app.command("create")
def user_create_command(
    group_id: int = typer.Option(..., "--group-id"),
    name: str = typer.Option(...),
    allowed_ip: list[str] | None = typer.Option(None, "--allowed-ip"),
    description: str = typer.Option("", "--description"),
) -> None:
    payload = UserCreate(
        group_id=group_id,
        name=name,
        allowed_ips_override=allowed_ip,
        description=description,
    )
    with SessionLocal() as session:
        user = create_user(session, payload)
        print_json(
            {
                "id": user.id,
                "group_id": user.group_id,
                "name": user.name,
                "allowed_ips_override": user.allowed_ips_override,
            }
        )


@user_app.command("list")
def user_list_command(group_id: int | None = typer.Option(None, "--group-id")) -> None:
    with SessionLocal() as session:
        users = list_users(session, group_id=group_id)
        print_json(
            [
                {
                    "id": user.id,
                    "group_id": user.group_id,
                    "name": user.name,
                    "allowed_ips_override": user.allowed_ips_override,
                    "is_active": user.is_active,
                }
                for user in users
            ]
        )


@user_app.command("delete")
def user_delete_command(user_id: int = typer.Option(..., "--user-id")) -> None:
    with SessionLocal() as session:
        delete_user(session, user_id)
        typer.echo(f"user {user_id} deleted")


@peer_app.command("create")
def peer_create_command(
    user_id: int = typer.Option(..., "--user-id"),
    name: str = typer.Option(...),
    assigned_ip: str | None = typer.Option(None, "--assigned-ip"),
    description: str = typer.Option("", "--description"),
) -> None:
    payload = PeerCreate(
        user_id=user_id,
        name=name,
        assigned_ip=assigned_ip,
        description=description,
    )
    with SessionLocal() as session:
        peer = create_peer(session, payload)
        print_json(
            {
                "id": peer.id,
                "user_id": peer.user_id,
                "name": peer.name,
                "assigned_ip": peer.assigned_ip,
                "is_active": peer.is_active,
                "created_at": peer.created_at,
                "updated_at": peer.updated_at,
                "revoked_at": peer.revoked_at,
            }
        )


@peer_app.command("list")
def peer_list_command(user_id: int | None = typer.Option(None, "--user-id")) -> None:
    with SessionLocal() as session:
        peers = list_peers(session, user_id=user_id)
        print_json(
            [
                {
                    "id": peer.id,
                    "user_id": peer.user_id,
                    "name": peer.name,
                    "assigned_ip": peer.assigned_ip,
                    "is_active": peer.is_active,
                    "created_at": peer.created_at,
                    "updated_at": peer.updated_at,
                    "revoked_at": peer.revoked_at,
                }
                for peer in peers
            ]
        )


@peer_app.command("resolved-access")
def peer_resolved_access_command(peer_id: int = typer.Option(..., "--peer-id")) -> None:
    with SessionLocal() as session:
        resolved = resolve_peer_access(session, peer_id)
        print_json(resolved.model_dump())


@peer_app.command("revoke")
def peer_revoke_command(peer_id: int = typer.Option(..., "--peer-id")) -> None:
    with SessionLocal() as session:
        peer = revoke_peer(session, peer_id)
        print_json(
            {
                "id": peer.id,
                "user_id": peer.user_id,
                "name": peer.name,
                "assigned_ip": peer.assigned_ip,
                "is_active": peer.is_active,
                "revoked_at": peer.revoked_at,
            }
        )


@peer_app.command("delete")
def peer_delete_command(peer_id: int = typer.Option(..., "--peer-id")) -> None:
    with SessionLocal() as session:
        delete_peer(session, peer_id)
        typer.echo(f"peer {peer_id} deleted")


@config_app.command("generate-peer")
def config_generate_peer_command(peer_id: int = typer.Option(..., "--peer-id")) -> None:
    print_json(api_request("POST", f"/config/peers/{peer_id}/generate"))


@config_app.command("generate-server")
def config_generate_server_command() -> None:
    print_json(api_request("POST", "/config/server/generate"))


@config_app.command("apply")
def config_apply_command() -> None:
    print_json(api_request("POST", "/config/server/apply"))


if __name__ == "__main__":
    app()
