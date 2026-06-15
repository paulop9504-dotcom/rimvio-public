#Requires -Version 5.1
<#
.SYNOPSIS
  Blink release zip backup (excludes node_modules, .next, secrets)

.USAGE
  npm run backup
  powershell -File scripts/backup-release.ps1
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$Desktop = [Environment]::GetFolderPath("Desktop")
$ZipName = "blink-backup-$Timestamp.zip"
$ZipPath = Join-Path $Desktop $ZipName
$Staging = Join-Path $env:TEMP "blink-backup-$Timestamp"

if (Test-Path $Staging) {
  Remove-Item -Recurse -Force $Staging
}

New-Item -ItemType Directory -Path $Staging | Out-Null

$ExcludeDirs = @("node_modules", ".next", "out", "build", ".git")
$ExcludeFiles = @("*.tsbuildinfo")

function Copy-ProjectTree {
  param([string]$Source, [string]$Dest)

  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    if ($ExcludeDirs -contains $_.Name) {
      return
    }

    if ($_.PSIsContainer) {
      $target = Join-Path $Dest $_.Name
      New-Item -ItemType Directory -Path $target -Force | Out-Null
      Copy-ProjectTree -Source $_.FullName -Dest $target
      return
    }

    $skip = $false
    foreach ($pattern in $ExcludeFiles) {
      if ($_.Name -like $pattern) {
        $skip = $true
        break
      }
    }

    if ($_.Name -like ".env" -or $_.Name -like ".env.local" -or $_.Name -like ".env.*.local") {
      $skip = $true
    }

    if (-not $skip) {
      Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Dest $_.Name) -Force
    }
  }
}

Copy-ProjectTree -Source $ProjectRoot -Dest $Staging

if (Test-Path $ZipPath) {
  Remove-Item -Force $ZipPath
}

Compress-Archive -Path (Join-Path $Staging "*") -DestinationPath $ZipPath -CompressionLevel Optimal
Remove-Item -Recurse -Force $Staging

$sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "Blink backup ready:" -ForegroundColor Green
Write-Host "  $ZipPath"
Write-Host "  ${sizeMb} MB"
Write-Host ""
