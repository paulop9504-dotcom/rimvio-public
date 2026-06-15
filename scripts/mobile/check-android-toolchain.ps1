# Rimvio Android toolchain check (Windows)
# Usage: powershell -File scripts/mobile/check-android-toolchain.ps1

$ErrorActionPreference = "Continue"
Write-Host "`nRimvio Android toolchain`n" -ForegroundColor Cyan

function Test-Command($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) {
    Write-Host "  OK  $name -> $($cmd.Source)" -ForegroundColor Green
    return $true
  }
  Write-Host "  --  $name not found" -ForegroundColor Yellow
  return $false
}

$java = Test-Command "java"
if ($java) {
  & java -version 2>&1 | ForEach-Object { Write-Host "      $_" }
}

Test-Command "adb" | Out-Null

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = "$env:LOCALAPPDATA\Android\Sdk" }
if (Test-Path $sdk) {
  Write-Host "  OK  Android SDK -> $sdk" -ForegroundColor Green
} else {
  Write-Host "  --  Android SDK not at $sdk" -ForegroundColor Yellow
  Write-Host "      Install Android Studio: https://developer.android.com/studio"
}

$ks = Join-Path $PSScriptRoot "..\..\android\keystore.properties"
$ks = [System.IO.Path]::GetFullPath($ks)
if (Test-Path $ks) {
  Write-Host "  OK  keystore.properties" -ForegroundColor Green
} else {
  Write-Host "  --  keystore.properties missing (copy from keystore.properties.example)" -ForegroundColor Yellow
}

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "  npm run store:export:play"
Write-Host "  npm run store:prepare:android -- --sync"
Write-Host "  npm run mobile:android"
Write-Host "  docs/PLAY_CONSOLE_INTERNAL_TEST.md`n"
