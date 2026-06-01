# aidlc-server tests

Two suites:

- **`../main_test.go`** — Go server tests (httptest): seeding, `/api/state`, `/api/save`
  (atomic write + field diff + digest ledger), `/api/digests`, `diffDocs`, `compactVal`,
  validation/error paths, NDJSON round-trip. No browser needed.
- **`ui.test.mjs`** — Playwright UI tests (`node:test` + `playwright-core`): renders all six
  workspaces, dark mode, offline fonts, copy-to-json removed / Save present, Save→digest
  round-trip, agent-ingest reply auto-appearing via polling, the agent-only unread badge, and
  booting from a real (non-demo) seeded project. `helpers.mjs` finds Chromium, builds + launches
  the server on a free port, and manages temp workspaces.

## Run

```bash
# from scripts/aidlc-server/
go test ./...                 # Go suite only
npm test                      # both suites (go test + node --test)
npm run test:ui               # UI suite only
```

## Prerequisites

- **Go** and **Node** on PATH.
- A Playwright Chromium for the UI suite. `helpers.mjs` auto-discovers one from the Playwright
  browser cache (`~/.../ms-playwright/chromium-*`). If none is present:
  ```bash
  npm install            # installs playwright-core (devDependency)
  npx playwright install chromium
  ```
  Or point at any Chromium/Chrome binary: set `AIDLC_CHROMIUM=/path/to/chrome`.

The Go binary is built automatically by the UI harness if missing (`go build`); the web assets are
committed, so no Node build step is required just to run the server.
