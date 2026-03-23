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

function Get-HealthAttempts {
    if ([string]::IsNullOrWhiteSpace($env:WG_STACK_HEALTH_ATTEMPTS)) {
        return 30
    }

    return [int]$env:WG_STACK_HEALTH_ATTEMPTS
}

function Get-HealthDelaySeconds {
    if ([string]::IsNullOrWhiteSpace($env:WG_STACK_HEALTH_DELAY_SECONDS)) {
        return 2
    }

    return [int]$env:WG_STACK_HEALTH_DELAY_SECONDS
}

function Wait-ApiHealth {
    param(
        [int]$Attempts = 30,
        [int]$DelaySeconds = 2
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            docker compose ps --status running wg-studio-api | Out-Null
            docker compose exec -T wg-studio-api python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3).getcode() == 200 else 1)" | Out-Null
            return
        } catch {
            Write-Host "Waiting for wg-studio-api health... ($attempt/$Attempts)"
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    throw "wg-studio-api did not become healthy in time."
}

function Test-WebReachable {
    try {
        docker compose exec -T wg-studio-api python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://wg-studio-web/wg-studio/', timeout=3).getcode() < 500 else 1)" | Out-Null
        return $true
    } catch {
        return $false
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
        Wait-ApiHealth -Attempts (Get-HealthAttempts) -DelaySeconds (Get-HealthDelaySeconds)
        docker compose exec -T wg-studio-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
        if (Test-WebReachable) {
            Write-Host "wg-studio-web is reachable."
        } else {
            throw "wg-studio-web is not reachable from the API container yet."
        }
    }
    "wait" {
        Wait-ApiHealth -Attempts (Get-HealthAttempts) -DelaySeconds (Get-HealthDelaySeconds)
    }
    "smoke" {
        Wait-ApiHealth -Attempts (Get-HealthAttempts) -DelaySeconds (Get-HealthDelaySeconds)
        if (-not (Test-WebReachable)) {
            throw "wg-studio-web is not reachable from the API container; aborting smoke run."
        }
        docker compose --profile test run --rm wg-studio-e2e @Args
    }
    "cli" {
        docker compose --profile tools run --rm wg-studio-cli @Args
    }
    "e2e" {
        docker compose --profile test run --rm wg-studio-e2e @Args
    }
    default {
        throw "Unsupported command '$Command'. Use: up, build, restart, down, ps, logs, wait, health, smoke, cli, e2e."
    }
}
