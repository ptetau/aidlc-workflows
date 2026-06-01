# Export — render workspace JSON back to markdown (`/aidlc export`)

Run this when the user wants markdown copies of the workspace documents: `/aidlc export`,
"render the workspace to markdown", "generate md from the JSON", "I want git-readable docs".

It is the **inverse of `/aidlc adopt`** and round-trips losslessly with it: each `.md` is
human-readable (headings, lists, tables) and carries a trailing canonical data block in an HTML
comment (`<!-- aidlc:<doc> v1 … -->`) that is invisible in rendered markdown but lets the JSON be
reconstructed exactly. So **JSON → md → JSON is identity** (verified by the converter's round-trip
tests).

## Steps

1. **Resolve + ensure built.** Find the `aidlc-server` binary (see `workspace-server.md` resolution
   order); the converter is built into it. `go build` alone suffices (assets are committed).

2. **Run the converter** from the project root:
   ```
   <server-dir>/aidlc-server export -docs aidlc-docs/workspace -out aidlc-docs/workspace/markdown
   ```
   This writes `aidlc-docs/workspace/markdown/<doc>.md` for every `<doc>.json` present (skips
   missing docs). `-out` defaults to `<ws>/markdown` if omitted.

3. **JSON stays canonical.** The exported markdown is a *readable, round-trippable rendering* of the
   canonical JSON — not a second source of truth. Don't hand-edit the data block; edit in the web
   UI (`/aidlc workspace`) or re-run export after changes. To pull markdown edits back, use
   `/aidlc adopt` (which reads the data block deterministically — see below).

4. **Report** the output directory and which docs were exported / skipped.

## Round-trip guarantee

- `aidlc-server export` (JSON → md) and `aidlc-server import -md <dir> -docs <ws>` (md → JSON) are
  exact inverses for any markdown that carries the data block.
- `/aidlc adopt` should prefer this deterministic `import` whenever a source file contains an
  `<!-- aidlc:<doc> … -->` block; it only falls back to interpretive prose conversion for legacy
  markdown that has no block (see `adopt-markdown.md`).
- Covered by `convert_test.go` (`TestRoundTrip*`): every seeded doc plus edge cases (empty
  collections, unicode, multi-line Gherkin, slider rules, text answers) survive JSON → md → JSON
  unchanged, and the markdown rendering is idempotent.
