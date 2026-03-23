param(
    [Parameter(Position = 0)]
    [string]$Command = "up",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"

function Resolve-StackServices {
    param(
        [string]$Target = "core"
    )

    switch ($Target) {
        "core" { return @("postgres", "wireguard", "wg-studio-api", "wg-studio-web") }
        "runtime" { return @("wireguard", "wg-studio-api") }
        "api" { return @("wg-studio-api") }
        "web" { return @("wg-studio-web") }
        "db" { return @("postgres") }
        default { return @($Target) }
    }
}

switch ($Command) {
    "up" {
        $target = if ($Args.Count -gt 0) { $Args[0] } else { "core" }
        $remaining = if ($Args.Count -gt 0) { $Args[1..($Args.Count - 1)] } else { @() }
        $services = Resolve-StackServices -Target $target
        docker compose up -d --build @services @remaining
    }
    "build" {
        $target = if ($Args.Count -gt 0) { $Args[0] } else { "core" }
        $remaining = if ($Args.Count -gt 0) { $Args[1..($Args.Count - 1)] } else { @() }
        $services = Resolve-StackServices -Target $target
        docker compose build @services @remaining
    }
    "restart" {
        $target = if ($Args.Count -gt 0) { $Args[0] } else { "core" }
        $remaining = if ($Args.Count -gt 0) { $Args[1..($Args.Count - 1)] } else { @() }
        $services = Resolve-StackServices -Target $target
        docker compose restart @services @remaining
    }
    "down" {
        docker compose down @Args
    }
    "ps" {
        docker compose ps @Args
    }
    "logs" {
        docker compose logs @Args
    }
    "health" {
        docker compose ps
        docker compose exec wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
    }
    "smoke" {
        docker compose --profile test run --rm wg-studio-e2e @Args
    }
    "cli" {
        docker compose --profile tools run --rm wg-studio-cli @Args
    }
    "e2e" {
        docker compose --profile test run --rm wg-studio-e2e @Args
    }
    default {
        throw "Unsupported command '$Command'. Use: up, build, restart, down, ps, logs, health, smoke, cli, e2e."
    }
}
