param(
    [string]$Remote = "origin",
    [string]$Branch = "",
    [switch]$FetchTags
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    & git @Args
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
    }
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = (& git branch --show-current).Trim()
    if (-not $Branch) {
        throw "Unable to detect the current branch."
    }
}

Write-Host "Pushing $Branch to $Remote..."
Invoke-Git -Args @("push", $Remote, $Branch)

Write-Host "Refreshing remote-tracking ref for $Remote/$Branch..."
$fetchArgs = @("fetch", $Remote, $Branch)
if ($FetchTags) {
    $fetchArgs += "--tags"
}
Invoke-Git -Args $fetchArgs

$localSha = (& git rev-parse HEAD).Trim()
$remoteSha = (& git rev-parse "refs/remotes/$Remote/$Branch").Trim()

Write-Host ""
Write-Host "Local HEAD : $localSha"
Write-Host "$Remote/$Branch : $remoteSha"

if ($localSha -eq $remoteSha) {
    Write-Host "Push verification OK."
} else {
    Write-Warning "Local HEAD and $Remote/$Branch differ after push."
}
