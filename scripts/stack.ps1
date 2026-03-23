param(
    [Parameter(Position = 0)]
    [string]$Command = "up",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"

switch ($Command) {
    "up" {
        docker compose up -d --build @Args
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
    "cli" {
        docker compose --profile tools run --rm wg-studio-cli @Args
    }
    "e2e" {
        docker compose --profile test run --rm wg-studio-e2e @Args
    }
    default {
        throw "Unsupported command '$Command'. Use: up, down, ps, logs, cli, e2e."
    }
}
