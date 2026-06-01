# Adopt — convert an existing markdown project into workspace JSON (`/aidlc adopt`)

Run this when a project already has markdown AI-DLC artifacts under `aidlc-docs/` and the user wants
the interactive workspace experience: `/aidlc adopt`, "convert this project to the workspace",
"migrate my md docs to JSON", "bring this into the web editor".

It reads the existing markdown artifacts, **emits conforming `workspace/<doc>.json`** for the six
covered documents (per `workspace-schemas.md`), flips the project to `html` mode, seeds the ingest
baselines, and launches the server. It is the inverse of the per-stage JSON emission — a one-shot
backfill for projects that predate the workspace.

## Preconditions

- An `aidlc-docs/` directory with at least one covered markdown artifact exists. If there are none,
  there is nothing to adopt — tell the user to run the normal `/aidlc` workflow instead.
- **Deterministic path first.** If a source `.md` already carries an `<!-- aidlc:<doc> … -->` data
  block (i.e. it was produced by `/aidlc export`), do NOT interpret it — convert losslessly with the
  built-in importer, which guarantees an exact round-trip:
  ```
  <server-dir>/aidlc-server import -md <dir-of-md> -docs aidlc-docs/workspace
  ```
- **Interpretive path (legacy prose).** Only for free-form markdown with no data block: this is
  **agent work, not a script** — prose → structured JSON requires interpretation. Read each source
  artifact and synthesize the JSON; do not pattern-match blindly.

## Steps

1. **Switch to html mode.** Set `Documentation Format: html` in `aidlc-docs/aidlc-state.md` (add the
   `## Project Configuration` section if missing) — same as `/aidlc update html` in `update-mode.md`.

2. **Idempotency / safety.** For each `workspace/<doc>.json` that already exists, do **not** silently
   overwrite — it may contain user edits. List which docs already exist and ask the user whether to
   regenerate them or keep them. Only generate the missing/approved ones.

3. **Convert each covered document.** For every source artifact that exists, read it and write a
   conforming `aidlc-docs/workspace/<doc>.json` (shapes in `workspace-schemas.md`). Mapping:

   | JSON | Source markdown | Conversion notes |
   |---|---|---|
   | `project.json` | `aidlc-state.md` (Project Information) + git remote | name, repo, branch, version |
   | `clarify.json` | `inception/requirements/requirements.md` (+ `requirement-verification-questions.md`) | Split the requirement prose into `requirement` segments; tag still-open items with `amb` ids and create matching `questions`; resolved decisions become answered questions; constraints/assumptions become `notes`. |
   | `stories.json` | `inception/user-stories/stories.md` (+ `personas.md`) | Epics → `epics`; each story → a card with `points`, `criteria` (Gherkin), `flagged`; map status to a `col` index (default to `Backlog` if none recorded). |
   | `arch.json` | `inception/application-design/*` (components, services, dependencies, unit-of-work) | Components/services → `nodes` (pick `type` ∈ api/db/ui/queue); dependencies → `edges`; **auto-layout** coords on a grid (e.g. x = 80 + col·280, y = 70 + row·180) since markdown has no positions; key config → `fields`. |
   | `infra.json` | `construction/{unit}/infrastructure-design/*` (+ `shared-infrastructure.md`) | Resources → `resources` (type ∈ compute/lb/db/cache with the per-type fields); regions → `regions`; rationale → `notes`. |
   | `tests.json` | `construction/build-and-test/*` | Tested components → `components`; test categories → `types`; build the `cells` matrix with `status` (pass/fail/none) and any captured script. |
   | `steering.json` | `AGENTS.md` (conventions) + any steering rules | Conventions → rule `groups` (toggle/slider); recorded exceptions → `exceptions`; a representative snippet → `sample`. |

   For a covered doc whose source artifacts don't exist yet (e.g. Construction not reached), **skip it**
   — leave it for the server to seed or for a later stage to generate. Note the skips to the user.

4. **Seed ingest baselines.** For every doc you generate, copy it to
   `aidlc-docs/workspace/.snapshot/<doc>.json` so the first `/aidlc ingest` diffs cleanly (same rule
   as first-generation in `workspace-schemas.md`).

5. **Do not delete the markdown.** Adoption is additive — the `.md` artifacts stay. JSON becomes
   canonical for the six covered docs going forward (`html-artifacts.md`); other artifacts remain
   markdown-only.

6. **Launch + report.** Start the server per `workspace-server.md` and give the user the URL. Append
   an entry to `aidlc-docs/audit.md` recording the adoption (which docs were converted, which skipped).

## Report to the user

Summarize: docs converted (with counts, e.g. "stories.json — 12 stories across 3 epics"), docs
skipped (and why), anything that needed interpretation or a default (e.g. auto-laid-out architecture
coordinates, defaulted kanban columns) so they can review and adjust in the UI.
