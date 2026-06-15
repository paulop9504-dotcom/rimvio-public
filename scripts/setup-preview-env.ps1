# Set Preview NEXT_PUBLIC_APP_URL for release/v1-rimvio-core branch deploys.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-preview-env.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$Project = "rimvio"
$PreviewBranch = "release/v1-rimvio-core"
$PreviewUrl = "https://new-project-pi-one-52.vercel.app"

Write-Host "=== Rimvio preview env ($PreviewBranch) ===" -ForegroundColor Cyan
npx vercel link --yes --project $Project | Out-Null

Write-Host "Setting NEXT_PUBLIC_APP_URL for preview branch..." -ForegroundColor Yellow
$PreviewUrl | npx vercel env add NEXT_PUBLIC_APP_URL preview $PreviewBranch --force

Write-Host "Done. Preview OAuth callback:" -ForegroundColor Green
Write-Host "  $PreviewUrl/auth/callback"
