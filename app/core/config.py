import os

from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = "postgresql+psycopg://wgstudio:wgstudio@postgres:5432/wg_studio"
    log_database_url: str = "postgresql+psycopg://wgstudio:wgstudio@postgres:5432/wg_studio_audit"
    artifact_root: str = "/wg/config"
    api_base_url: str = "http://wg-studio-api:8000"
    server_endpoint: str = "vpn.example.com"
    server_listen_port: int = 51820
    server_address: str = "10.255.255.1/32"
    server_dns: list[str] = ["1.1.1.1"]
    docker_socket_path: str = "/var/run/docker.sock"
    wireguard_container_name: str = "wg-studio-wireguard"
    wireguard_interface_name: str = "wg0"
    wireguard_config_path: str = "/config/wg_confs/wg0.conf"
    bootstrap_admin_username: str | None = None
    bootstrap_admin_password: str | None = None
    jwt_secret_key: str = "change-me"
    jwt_access_token_ttl_minutes: int = 15
    jwt_refresh_token_ttl_days: int = 30


settings = Settings(
    database_url=os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://wgstudio:wgstudio@postgres:5432/wg_studio",
    ),
    log_database_url=os.getenv(
        "LOG_DATABASE_URL",
        "postgresql+psycopg://wgstudio:wgstudio@postgres:5432/wg_studio_audit",
    ),
    artifact_root=os.getenv("ARTIFACT_ROOT", "/wg/config"),
    api_base_url=os.getenv("WG_STUDIO_API_URL", "http://wg-studio-api:8000"),
    server_endpoint=os.getenv("WG_SERVER_ENDPOINT", "vpn.example.com"),
    server_listen_port=int(os.getenv("WG_SERVER_LISTEN_PORT", "51820")),
    server_address=os.getenv("WG_SERVER_ADDRESS", "10.255.255.1/32"),
    server_dns=[
        value.strip()
        for value in os.getenv("WG_SERVER_DNS", "1.1.1.1").split(",")
        if value.strip()
    ],
    docker_socket_path=os.getenv("DOCKER_SOCKET_PATH", "/var/run/docker.sock"),
    wireguard_container_name=os.getenv(
        "WG_CONTAINER_NAME", "wg-studio-wireguard"
    ),
    wireguard_interface_name=os.getenv("WG_INTERFACE_NAME", "wg0"),
    wireguard_config_path=os.getenv(
        "WG_CONTAINER_CONFIG_PATH", "/config/wg_confs/wg0.conf"
    ),
    bootstrap_admin_username=os.getenv("WG_BOOTSTRAP_ADMIN_USERNAME"),
    bootstrap_admin_password=os.getenv("WG_BOOTSTRAP_ADMIN_PASSWORD"),
    jwt_secret_key=os.getenv("WG_JWT_SECRET_KEY", "change-me"),
    jwt_access_token_ttl_minutes=int(
        os.getenv("WG_JWT_ACCESS_TOKEN_TTL_MINUTES", "15")
    ),
    jwt_refresh_token_ttl_days=int(
        os.getenv("WG_JWT_REFRESH_TOKEN_TTL_DAYS", "30")
    ),
)
