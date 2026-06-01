# build.ps1 — compile web UI assets then build the Go binary (Windows).
# Run from this directory. Requires Node + Go. esbuild installs on first run.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path node_modules/esbuild)) {
  Write-Host "Installing esbuild…"
  npm install --no-audit --no-fund
}

Write-Host "Compiling web UI…"
node build.mjs

Write-Host "Building aidlc-server.exe…"
go build -o aidlc-server.exe .

Write-Host "Done. Run: .\aidlc-server.exe -docs <project>\aidlc-docs\workspace"
