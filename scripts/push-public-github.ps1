# Sync tracked files to the public GitHub mirror (rimvio-public), excluding sensitive paths.
# Usage: npm run push:public   or   powershell -File scripts/push-public-github.ps1 [-DryRun]

param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$excludeFile = Join-Path $PSScriptRoot "public-exclude-paths.txt"
$publicRemote = "https://github.com/paulop9504-dotcom/rimvio-public.git"
$staging = Join-Path $root ".public-staging"

function Test-ExcludedPath {
  param([string]$RelativePath, [string[]]$Patterns)
  foreach ($pattern in $Patterns) {
    $p = $pattern.Trim()
    if (-not $p -or $p.StartsWith("#")) { continue }
    $base = $p.TrimEnd("/")
    if ($RelativePath -eq $base) { return $true }
    if ($RelativePath.StartsWith("$base/")) { return $true }
    if ($RelativePath -like $p) { return $true }
  }
  return $false
}

$patterns = Get-Content $excludeFile -ErrorAction Stop
$tracked = git -C $root -c core.quotepath=false ls-files
$included = @()
foreach ($path in $tracked) {
  if (-not (Test-ExcludedPath -RelativePath $path -Patterns $patterns)) {
    $included += $path
  }
}

Write-Host "Public sync: $($included.Count) files (excluded $($tracked.Count - $included.Count) of $($tracked.Count) tracked)"

if ($DryRun) {
  $included | ForEach-Object { Write-Host "  + $_" }
  exit 0
}

if (Test-Path $staging) {
  Remove-Item -Recurse -Force $staging
}
New-Item -ItemType Directory -Force -Path $staging | Out-Null

foreach ($path in $included) {
  $src = Join-Path $root $path
  $dest = Join-Path $staging $path
  $destDir = [System.IO.Path]::GetDirectoryName($dest)
  if ($destDir -and -not (Test-Path -LiteralPath $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  Copy-Item -LiteralPath $src -Destination $dest -Force
}

Push-Location $staging
try {
  if (-not (Test-Path ".git")) {
    git init | Out-Null
    git branch -M main | Out-Null
  }
  $gitName = git -C $root config user.name 2>$null
  $gitEmail = git -C $root config user.email 2>$null
  if ($gitName) { git config user.name $gitName | Out-Null }
  if ($gitEmail) { git config user.email $gitEmail | Out-Null }
  git add -A
  $status = git status --porcelain
  if (-not $status) {
    Write-Host "No changes to push."
    exit 0
  }
  git commit -m "sync: mirror from private rimvio ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" | Out-Null
  $remotes = git remote
  if ($remotes -notcontains "public") {
    git remote add public $publicRemote
  }
  git push -u public main --force
  if ($LASTEXITCODE -ne 0) {
    throw "git push failed (exit $LASTEXITCODE)"
  }
  Write-Host "Pushed to $publicRemote"
}
finally {
  Pop-Location
  Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
}
