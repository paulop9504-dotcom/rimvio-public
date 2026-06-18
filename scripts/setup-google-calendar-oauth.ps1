# Rimvio — Google Calendar OAuth env helper (Windows)
# Writes GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET into .env.local

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.local"
$exampleFile = Join-Path $repoRoot ".env.example"

$appUrl = "http://localhost:3000"
if (Test-Path $envFile) {
  $existing = Get-Content $envFile -Raw
  if ($existing -match 'NEXT_PUBLIC_APP_URL=(.+)') {
    $appUrl = $Matches[1].Trim().Trim('"').Trim("'")
  }
} elseif (Test-Path $exampleFile) {
  Copy-Item $exampleFile $envFile
  Write-Host "Created .env.local from .env.example"
}

$redirectUri = "$appUrl/api/integrations/oauth/callback"

Write-Host ""
Write-Host "=== Rimvio Google Calendar OAuth ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open Google Cloud Console -> APIs & Services -> Credentials"
Write-Host "   $($appUrl -replace 'http://','https://console.cloud.google.com/apis/credentials')"
Write-Host "2. Create OAuth client ID (Web application)"
Write-Host "3. Authorized redirect URI (exact):"
Write-Host "   $redirectUri" -ForegroundColor Yellow
Write-Host "4. Enable Google Calendar API for the project"
Write-Host ""

$clientId = Read-Host "GOOGLE_CLIENT_ID"
$clientSecret = Read-Host "GOOGLE_CLIENT_SECRET" -AsSecureString
$clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
)

if (-not $clientId.Trim() -or -not $clientSecretPlain.Trim()) {
  Write-Host "Aborted — empty client id or secret." -ForegroundColor Red
  exit 1
}

function Set-EnvLine {
  param([string]$Path, [string]$Key, [string]$Value)
  $lines = @()
  if (Test-Path $Path) {
    $lines = Get-Content $Path
  }
  $prefix = "$Key="
  $filtered = $lines | Where-Object { $_ -notmatch "^\s*$([regex]::Escape($Key))=" }
  $filtered += "$Key=$Value"
  Set-Content -Path $Path -Value $filtered -Encoding utf8
}

Set-EnvLine $envFile "GOOGLE_CLIENT_ID" $clientId.Trim()
Set-EnvLine $envFile "GOOGLE_CLIENT_SECRET" $clientSecretPlain.Trim()

if (-not (Select-String -Path $envFile -Pattern '^\s*NEXT_PUBLIC_APP_URL=' -Quiet)) {
  Add-Content -Path $envFile -Value "NEXT_PUBLIC_APP_URL=$appUrl"
}

Write-Host ""
Write-Host "Saved to .env.local" -ForegroundColor Green
Write-Host "Restart dev server, then: Settings -> Google Calendar -> Connect account"
Write-Host ""
