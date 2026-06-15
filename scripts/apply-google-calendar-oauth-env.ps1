# Rimvio — Google Calendar OAuth: .env.local + Vercel (one shot)
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/apply-google-calendar-oauth-env.ps1 `
#     -ClientId "xxxx.apps.googleusercontent.com" `
#     -ClientSecret "GOCSPX-xxxx" `
#     -DeployProd

param(
  [Parameter(Mandatory = $true)]
  [string]$ClientId,
  [Parameter(Mandatory = $true)]
  [string]$ClientSecret,
  [switch]$DeployProd
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.local"
$appUrl = "http://localhost:3000"

function Set-EnvLine {
  param([string]$Path, [string]$Key, [string]$Value)
  $lines = @()
  if (Test-Path $Path) {
    $lines = Get-Content $Path
  }
  $filtered = $lines | Where-Object { $_ -notmatch "^\s*$([regex]::Escape($Key))=" }
  $filtered += "$Key=$Value"
  Set-Content -Path $Path -Value $filtered -Encoding utf8
}

function New-IntegrationsEncryptionKey {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

if (-not $ClientId.Trim() -or -not $ClientSecret.Trim()) {
  Write-Host "ClientId and ClientSecret are required." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $repoRoot ".env.example") $envFile
}

$encryptionKey = $null
if (Test-Path $envFile) {
  $raw = Get-Content $envFile -Raw
  if ($raw -match 'INTEGRATIONS_ENCRYPTION_KEY=(.+)') {
    $encryptionKey = $Matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $encryptionKey) {
  $encryptionKey = New-IntegrationsEncryptionKey
}

Set-EnvLine $envFile "GOOGLE_CLIENT_ID" $ClientId.Trim()
Set-EnvLine $envFile "GOOGLE_CLIENT_SECRET" $ClientSecret.Trim()
Set-EnvLine $envFile "INTEGRATIONS_ENCRYPTION_KEY" $encryptionKey
if (-not (Select-String -Path $envFile -Pattern '^\s*NEXT_PUBLIC_APP_URL=' -Quiet)) {
  Add-Content -Path $envFile -Value "NEXT_PUBLIC_APP_URL=$appUrl"
}

Write-Host "Updated .env.local (GOOGLE_CLIENT_* + INTEGRATIONS_ENCRYPTION_KEY)" -ForegroundColor Green

$vercelTargets = @("production", "preview", "development")
foreach ($name in @("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "INTEGRATIONS_ENCRYPTION_KEY")) {
  $value = switch ($name) {
    "GOOGLE_CLIENT_ID" { $ClientId.Trim() }
    "GOOGLE_CLIENT_SECRET" { $ClientSecret.Trim() }
    "INTEGRATIONS_ENCRYPTION_KEY" { $encryptionKey }
  }
  foreach ($target in $vercelTargets) {
    Write-Host "Vercel env: $name ($target)..."
    $value | npx vercel env add $name $target --force 2>&1 | Out-Host
  }
}

Write-Host "Vercel env updated." -ForegroundColor Green

if ($DeployProd) {
  Write-Host "Deploying production..."
  npx vercel deploy --prod 2>&1 | Out-Host
}

Write-Host ""
Write-Host "Next: restart dev server, open /welcome, connect Google Calendar." -ForegroundColor Cyan
Write-Host "  http://localhost:3000/welcome"
Write-Host "  https://new-project-pi-one-52.vercel.app/welcome (after deploy)"
