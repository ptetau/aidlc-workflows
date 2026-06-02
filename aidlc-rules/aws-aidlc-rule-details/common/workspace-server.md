# Workspace Server (`/aidlc workspace`)

The **workspace server** (`aidlc-server`) renders the six most-edited AI-DLC documents as a
connected, interactive web app and stores their state as **JSON** under
`aidlc-docs/workspace/`. The user edits in the browser, clicks **Save**, and the change is recorded
as a digest. Running `/aidlc ingest` lets you (the agent) react to those edits — see `ingest.md`.

This is the **html-mode** editor for the six covered documents. It does not replace the markdown
workflow for the other artifacts; see `html-artifacts.md`.

**Adopting an existing markdown project?** If the project already has markdown artifacts but no
`workspace/*.json`, run `/aidlc adopt` first to convert them (see `adopt-markdown.md`); then launch
the server.

## The six covered documents

| Workspace | JSON file | Source AI-DLC artifact(s) |
|---|---|---|
| Clarification | `clarify.json` | `inception/requirements/requirements.md` (+ verification questions) |
| Stories | `stories.json` | `inception/user-stories/stories.md` (+ personas) |
| Architecture | `arch.json` | `inception/application-design/*` |
| Infrastructure | `infra.json` | `construction/{unit}/infrastructure-design/*` |
| Tests | `tests.json` | `construction/build-and-test/*` |
| Steering | `steering.json` | `AGENTS.md` + steering rules |

Plus `project.json` (project name/repo/branch/version). The exact JSON shapes are in
`workspace-schemas.md` — emit conforming JSON whenever you generate or regenerate these documents.

## On-disk layout

```
aidlc-docs/workspace/
  project.json  clarify.json  stories.json  arch.json  infra.json  tests.json  steering.json
  digests.ndjson         # append-only change-conversation ledger (user + agent entries)
  .snapshot/<doc>.json   # last-ingested baseline — you own this during ingest
```

## Launching the server (`/aidlc workspace`)

1. **Resolve the server directory** (first that exists):
   1. `aidlc-rules/scripts/aidlc-server/` — project-local copy distributed with the rules
   2. `.aidlc/aidlc-rules/scripts/aidlc-server/`
   3. the skill-bundled global copy (see the absolute path in the global install)
2. **Ensure it is built.** If no `aidlc-server` / `aidlc-server.exe` binary exists in that dir,
   build it. The compiled web assets are committed, so **Go alone is enough** — no Node required:
   ```
   # from the server directory
   go build -o aidlc-server.exe .      # Windows
   go build -o aidlc-server .          # macOS/Linux
   ```
   (Only run `build.ps1` / `build.sh` if you changed the web UI sources — that step needs Node.)
3. **Launch it from the project root** (so it finds `./aidlc-docs/workspace`), in the background:
   ```
   <server-dir>/aidlc-server.exe          # defaults to ./aidlc-docs/workspace, opens the browser
   # or point it explicitly:
   <server-dir>/aidlc-server.exe -docs <project>/aidlc-docs/workspace
   ```
   Flags: `-port <n>` (omit/0 = **auto per-project port**), `-docs <path>`, `-no-open`.
   **Each project gets its own port** by default — derived from the project path (range 7400–7999),
   then the next free port if that's taken — so several aidlc projects can run at once without
   colliding. The server prints the chosen URL on startup: `listening on http://localhost:<port>`.
4. **First run seeds EMPTY scaffolds** for any missing doc — blank, valid shapes (project name
   derived from the folder), never example content. The agent fills them by generating real JSON
   during the relevant workflow stage (per `workspace-schemas.md`). The built-in `billing-service`
   demo is **dev-only** — pass `-demo` to seed it (showcase/iterating on the tool), never for a real
   project.
5. **Tell the user the URL** — read the actual port from the server's startup line
   (`listening on http://localhost:<port>`); do not assume a fixed port. The browser opens
   automatically unless `-no-open` was passed.

## Save semantics

- **Save** in any workspace POSTs the full document (in its JSON schema shape) to the server, which
  writes `aidlc-docs/workspace/<doc>.json` atomically and appends a `user` entry to
  `digests.ndjson` summarizing which top-level fields changed (auto-derived from the diff). The
  save API also accepts an optional `note` used as the summary when present.
- The browser's Digest panel polls the server, so when you append an `agent` entry during ingest it
  appears in the UI automatically (~3s) with no reload.

## Presenting it for review

When you direct the user to the workspace at an approval gate, give them the URL:

```
🌐 AI-DLC Workspace — http://localhost:7421   (edit, Save, then run /aidlc ingest)
```
