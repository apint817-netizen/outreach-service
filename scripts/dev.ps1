Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "== Outreach Service dev =="

if (-not (Test-Path ".\node_modules")) {
  Write-Host "Installing dependencies (pnpm i)..."
  pnpm i
}

Write-Host "Starting workspace dev (server + ui)..."
pnpm dev
