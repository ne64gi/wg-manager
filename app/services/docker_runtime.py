from app.runtime.wireguard import DockerWireGuardRuntime, ExecResult, get_wireguard_runtime


def ensure_docker_socket_available() -> None:
    runtime = get_wireguard_runtime()
    if not isinstance(runtime, DockerWireGuardRuntime):
        raise ValueError("docker runtime adapter is not active")
    runtime.ensure_available()


def docker_exec(command: list[str], *, capture_output: bool = False) -> ExecResult:
    runtime = get_wireguard_runtime()
    if not isinstance(runtime, DockerWireGuardRuntime):
        raise ValueError("docker runtime adapter is not active")
    return runtime.exec(command, capture_output=capture_output)


__all__ = [
    "DockerWireGuardRuntime",
    "ExecResult",
    "docker_exec",
    "ensure_docker_socket_available",
]
