# Push .env.local keys to linked Vercel project (Production + Preview + Development).
# Prereq: npx vercel login  (new account)  &&  npx vercel link
# Usage:  pwsh scripts/push-vercel-env-from-local.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$envFile = Join-Path (Get-Location) ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.local not found"
}

$prodUrl = $env:RIMVIO_PROD_URL
if (-not $prodUrl) {
  $prodUrl = "https://rimvio.vercel.app"
}

$skip = @(
  "VERCEL_OIDC_TOKEN",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF"
)

$keys = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_AUTH_REQUIRED",
  "AUTH_REQUIRED",
  "GEMINI_API_KEY",
  "GEMINI_VISION_MODEL",
  "CAPTURE_VISION_PROVIDER",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CLOUD_VISION_API_KEY",
  "INTEGRATIONS_ENCRYPTION_KEY",
  "KAKAO_REST_API_KEY",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "OPENAI_OCR_MODEL",
  "OPENAI_VISION_MODEL",
  "OPENWEATHER_API_KEY"
)

Write-Host "=== Rimvio Vercel env push ===" -ForegroundColor Cyan
Write-Host "Production APP_URL override: $prodUrl"
Write-Host ""

foreach ($key in $keys) {
  if ($skip -contains $key) { continue }

  $line = Select-String -Path $envFile -Pattern "^$([regex]::Escape($key))=" | Select-Object -First 1
  if (-not $line) { continue }

  $value = ($line.Line -split "=", 2)[1].Trim().Trim('"').Trim("'")
  if ($key -eq "NEXT_PUBLIC_APP_URL") {
    $value = $prodUrl
  }
  if ([string]::IsNullOrWhiteSpace($value)) { continue }

  foreach ($target in @("production", "preview", "development")) {
    $value | npx vercel env add $key $target --force 2>&1 | Out-Null
    Write-Host "  $key ($target)"
  }
}

Write-Host ""
Write-Host "Done. Redeploy: npx vercel deploy --prod" -ForegroundColor Green
