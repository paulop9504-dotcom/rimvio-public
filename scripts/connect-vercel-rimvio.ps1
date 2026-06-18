# Connect Vercel project `rimvio` to GitHub paulop9504-dotcom/rimvio
# Usage: powershell -ExecutionPolicy Bypass -File scripts/connect-vercel-rimvio.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$RimvioRepo = "https://github.com/paulop9504-dotcom/rimvio.git"
$Project = "rimvio"
$ProdUrl = "https://new-project-pi-one-52.vercel.app"

Write-Host "=== Vercel <-> rimvio Git connect ===" -ForegroundColor Cyan

npx vercel link --yes --project $Project

Write-Host "`nDisconnect legacy glango (if connected)..." -ForegroundColor Yellow
npx vercel git disconnect --yes 2>$null

Write-Host "Connect rimvio repo..." -ForegroundColor Yellow
npx vercel git connect $RimvioRepo --yes

Write-Host "`nDone." -ForegroundColor Green
Write-Host "Project: $Project"
Write-Host "Git:     paulop9504-dotcom/rimvio"
Write-Host "Prod:    $ProdUrl"
Write-Host ""
Write-Host "Branches:"
Write-Host "  main                    -> Production"
Write-Host "  release/v1-rimvio-core  -> Preview"
Write-Host "Verify: npm run verify:pipeline && git push origin release/v1-rimvio-core"
