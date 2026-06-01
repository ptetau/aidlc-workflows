# Ingest (`/aidlc ingest`)

When the user has edited workspace documents in the browser and clicked **Save**, they run
`/aidlc ingest` to have you react. Ingest is the agent half of the change-conversation: you read
what changed, **make your own changes** (regenerate affected downstream documents), and **write
back an ack + next steps** that the web UI displays automatically.

Run this whenever the user says `/aidlc ingest`, "ingest", "ingest my changes", or "I saved some
edits, react to them".

## Inputs

- `aidlc-docs/workspace/<doc>.json` — current state (what the user just saved).
- `aidlc-docs/workspace/.snapshot/<doc>.json` — the baseline from the last ingest (seeded on first
  run). The diff between these is what the user changed.
- `aidlc-docs/workspace/digests.ndjson` — the ledger. `user` entries (with optional notes) tell you
  *why* the user changed something; read entries appended since the last `agent` entry.

## Protocol

1. **Detect changes.** For each of the six docs, compare the live `workspace/<doc>.json` against
   `.snapshot/<doc>.json`. List the documents that changed and, within each, the meaningful field
   changes. Read the `user` digest notes for intent.

2. **React — regenerate downstream.** For each changed document, propagate the change by
   re-entering the relevant existing workflow stage, guided by the diff. Typical chains:
   - **clarify** (resolved ambiguities / new constraints) → re-derive **stories** (and personas).
   - **stories** (new/edited/flagged stories) → revisit **application design / architecture**.
   - **arch** (topology/schema change) → revisit **infrastructure**.
   - **infra** (resource/exposure change) → note security/NFR implications.
   - **steering** (rule changes) → apply to future code generation; reconcile `AGENTS.md`.
   - **tests** → reconcile with build-and-test artifacts.

   Write the regenerated documents back as `workspace/<doc>.json` (per `workspace-schemas.md`) **and**
   update the corresponding `.md` artifact(s) so markdown and JSON stay consistent. Respect approval
   gates — if a regeneration is large or risky, describe it in the digest and ask before applying,
   rather than silently rewriting.

3. **Ack + next digest.** Append **one `agent` entry** to `digests.ndjson` summarizing what you did
   and what the user should do next. The UI shows it automatically. Append a single JSON line
   (no pretty-printing) of this shape:
   ```json
   {"id":"<unix-nanos>-agent","ts":"<RFC3339 UTC>","actor":"agent","workspace":"stories","summary":"Regenerated 3 stories from the resolved billing-cadence ambiguity; flagged s4 needs a points estimate.","nextSteps":["Review the 3 new stories in the Stories board","Set acceptance criteria on s7"],"changes":[{"field":"cards","before":"7 stories","after":"10 stories"}]}
   ```
   - `actor` MUST be `"agent"` (the UI styles these as the aidlc reply and counts them as unread).
   - `summary` = plain-language account of what you changed. `nextSteps` = concrete actions for the
     user. `workspace` = the primary doc you touched (or omit if several).
   - Generate `id` and `ts` yourself (e.g. a nanosecond timestamp + `-agent`, and the current UTC
     time in RFC3339). Append with a newline; never rewrite existing lines.

4. **Refresh the baseline.** Copy each current `workspace/<doc>.json` over its
   `.snapshot/<doc>.json` so the next ingest diffs against this new state.

5. **Audit.** Append a line to `aidlc-docs/audit.md` recording the ingest (which docs changed, what
   you regenerated), per the normal audit rules.

## Notes

- If nothing changed since the last snapshot, say so and write a short `agent` digest entry stating
  there was nothing to ingest — don't fabricate work.
- The server may be running while you ingest; writing `workspace/*.json` is fine (the UI re-reads on
  its next poll / on reload). You do not need to stop the server.
