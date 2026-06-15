# Rimvio production deploy — build, verify, deploy, health check
# Usage: powershell -ExecutionPolicy Bypass -File scripts/deploy-production.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$Project = "rimvio"
$ProdUrl = "https://new-project-pi-one-52.vercel.app"
$PreviewBranch = "release/v1-rimvio-core"

Write-Host "=== Rimvio production deploy ===" -ForegroundColor Cyan

Write-Host "`n[0/5] Pipeline gate..." -ForegroundColor Yellow
npm run verify:pipeline
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[1/5] Pull Vercel production env..." -ForegroundColor Yellow
npx vercel link --yes --project $Project | Out-Null
npx vercel env pull .env.vercel.production --environment=production --yes

$appUrlLine = Select-String -Path .env.vercel.production -Pattern "^NEXT_PUBLIC_APP_URL=" -ErrorAction SilentlyContinue
if (-not $appUrlLine -or $appUrlLine.Line -match '^NEXT_PUBLIC_APP_URL=""?$') {
  Write-Host "Fixing empty NEXT_PUBLIC_APP_URL on Vercel..." -ForegroundColor Yellow
  $ProdUrl | npx vercel env add NEXT_PUBLIC_APP_URL production --force
  $ProdUrl | npx vercel env add NEXT_PUBLIC_APP_URL preview $PreviewBranch --force
  npx vercel env pull .env.vercel.production --environment=production --yes
}

Write-Host "`n[2/5] Deploy readiness..." -ForegroundColor Yellow
$env:DEPLOY_URL = $ProdUrl
npx tsx scripts/verify-deploy-readiness.ts --vercel-env
if ($LASTEXITCODE -ne 0) {
  Write-Host "Readiness check failed. Fix env vars before deploy." -ForegroundColor Red
  exit 1
}

Write-Host "`n[3/5] Production build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[4/5] Vercel deploy --prod..." -ForegroundColor Yellow
npx vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[5/5] Remote health check..." -ForegroundColor Yellow
npx tsx scripts/verify-deploy-readiness.ts --vercel-env --remote
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nDone. Production: $ProdUrl" -ForegroundColor Green
Write-Host "Supabase → Auth → URL Configuration:" -ForegroundColor Cyan
Write-Host "  Site URL: $ProdUrl"
Write-Host "  Redirect URLs: $ProdUrl/auth/callback"
