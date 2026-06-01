#!/usr/bin/env bash
# build.sh — compile web UI assets then build the Go binary (macOS/Linux).
# Run from this directory. Requires Node + Go. esbuild installs on first run.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules/esbuild ]; then
  echo "Installing esbuild…"
  npm install --no-audit --no-fund
fi

echo "Compiling web UI…"
node build.mjs

echo "Building aidlc-server…"
go build -o aidlc-server .

echo "Done. Run: ./aidlc-server -docs <project>/aidlc-docs/workspace"
