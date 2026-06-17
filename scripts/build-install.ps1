# OpenCommit — Build, Package & Install
# Usage: .\scripts\build-install.ps1 [patch|minor|major]
# Default bump: patch
param(
    [ValidateSet("patch", "minor", "major")]
    [string]$Bump = "patch"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSCommandPath | Split-Path -Parent
Set-Location $projectRoot

Write-Host "`n=== OpenCommit Build & Install ===" -ForegroundColor Cyan

# 1. Read current version
$pkg = Get-Content package.json | ConvertFrom-Json
$oldVersion = $pkg.version
Write-Host "[1/4] Current version: $oldVersion" -ForegroundColor Gray

# 2. Bump version
Write-Host "[2/4] Bumping version ($Bump)..." -ForegroundColor Yellow
npm version $Bump --no-git-tag-version 2>&1 | Out-Null

$pkg = Get-Content package.json | ConvertFrom-Json
$newVersion = $pkg.version
$vsixName = "opencommit-$newVersion.vsix"

# 3. Compile TypeScript
Write-Host "[3/4] Compiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) { throw "Compilation failed" }

# 4. Package & Install
Write-Host "[4/4] Packaging & installing $vsixName ..." -ForegroundColor Yellow
npx @vscode/vsce package 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Packaging failed" }

code --install-extension $vsixName
if ($LASTEXITCODE -ne 0) { throw "Installation failed" }

Write-Host "`nDone! $oldVersion -> $newVersion  |  Installed: $vsixName" -ForegroundColor Green
Write-Host "Restart VS Code (Reload Window) to apply changes.`n" -ForegroundColor Gray
