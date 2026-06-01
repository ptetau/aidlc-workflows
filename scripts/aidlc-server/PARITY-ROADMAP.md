# aidlc-server → vanilla parity — roadmap & architecture

Goal (user-chosen): close the gaps in `GAP-ANALYSIS.md` toward full parity. Built in verified
increments (P0 → P1 → P2), checking in with the user at phase boundaries.

## The one architectural rule (read first)

**The workflow engine is agent-driven. The server reflects state and records human decisions; the
agent still drives.** There is no hidden runtime state in vanilla aidlc — the `[ ]/[x]` checkboxes +
`aidlc-state.md` *are* the engine, executed by the agent in the CLI. So the server must **never** try
to *drive* the workflow (a UI "Approve" button blocks nothing — the agent isn't waiting on HTTP).

Everything maps onto the channel we already built:
- **Human decisions** (approve a gate, request changes, mark a step done) → append a typed event to
  `digests.ndjson` (e.g. `{actor:'user', type:'gate', stage, decision:'approve'|'changes', note}`).
  `/aidlc ingest` consumes these and proceeds. No new control path.
- **Engine state** (stages, plans, audit) → the server **reads canonical markdown read-only** and
  reflects it. Human edits to those are *proposals* (ledger events), not direct writes.

### Mixed canonicality (name it, don't drift)
- **JSON-canonical** (rich editor, save→ingest): the 6 docs today, plus any *new* doc that earns a
  genuine rich editor (candidates: domain-entities, business-rules).
- **Markdown-canonical** (server reads; edits = proposals via ledger): `aidlc-state.md`, all
  `plans/*.md`, `audit.md`, reverse-engineering, NFR, code summaries, operations, and any prose doc.
- **Do NOT** introduce a `workspace/state.json` the agent also writes — two-master sync on the
  engine's own state is the one thing worse than the 6-doc sync the ingest loop already manages.

## Increments

### P0 — Honest, complete window (read-only engine reflection)  ← building now
- `GET /api/project`: parse `aidlc-docs/aidlc-state.md` read-only → phase, per-stage status
  (done/skip/pending), extensions, doc format, project info. Zero new agent-written state files.
- `GET /api/docs` + `GET /api/doc?path=`: list & read every `aidlc-docs/**/*.md` (RE, FD, NFR, plans,
  code summaries, audit, state) outside `workspace/`.
- UI: an **Overview** view (workflow state/progress + extensions) and a **Documents** view (all md,
  rendered read-only via re-vendored `marked.js`). Nav items carry real stage status.
- Verify with Playwright; commit; **check in before P1**.

### P1 — Enrich the 6 (fidelity)
clarify: FR/NFR/decisions/scope. stories: personas, narrative, US-* IDs, priority, RBAC matrix.
arch: units-of-work + **story→unit map** + component methods. tests: build-and-test summary.
steering: real AGENTS.md content. (All JSON-canonical, save→ingest, round-trip tested.)

### P2 — Editable rest + engine surfaces (large; per-unit isolated to the end)
- Rich JSON-canonical editors only where they beat a textarea: **domain-entities**, **business-rules**.
- Everything else editable as **markdown** (textarea + preview; edit = ledger proposal).
- **Gate affordances**: Approve / Request-changes buttons that write gate events to the ledger.
- **Plan/checkbox reflection**: render `plans/*.md` `[ ]/[x]`; optional "mark done" = ledger event.
- **Extensions** compliance view; **brownfield** RE surface; verbatim **audit** view.
- **Per-unit construction** (arch/infra/tests gain a unit dimension) — LAST, isolated; do not refactor
  the green 6-workspace core early for it.

## Non-goals
Replicating freeform markdown (Mermaid/ASCII diagrams, code-org trees, command blocks) as structured
fields — the agent + markdown remain better; surface these as rendered markdown, not editors.
