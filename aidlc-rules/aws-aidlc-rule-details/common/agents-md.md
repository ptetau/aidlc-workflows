# AGENTS.md Generation

## Purpose

`AGENTS.md` is the primary steering document for any AI agent working on the
project. It lives at the **project root** (not inside `aidlc-docs/`) and tells
Claude Code — and any other AI assistant — how to navigate and work in the
codebase without needing to re-read all the aidlc-docs artifacts each time.

## When to generate / update

| Trigger | Action |
|---|---|
| End of Inception (after Units Generation or Application Design approval, whichever is last) | Generate `AGENTS.md` at project root |
| End of Construction (after Build and Test approval) | Regenerate `AGENTS.md` — tech stack, structure, and build commands are now concrete |

## What goes in AGENTS.md

Synthesize from the aidlc-docs artifacts that exist at generation time. Use
plain prose — no `[Answer]:` tags, no internal aidlc scaffolding.

### Required sections

```markdown
# AGENTS.md

## Project overview
<1-3 sentences: what the system does, who uses it, and why it exists.
Source: requirements.md intent analysis, business-overview.md (brownfield)>

## Tech stack
<Key languages, frameworks, runtime, build tools, test framework.
Source: technology-stack.md (brownfield) or application-design.md / nfr-design.md>

## Repository structure
<Annotated directory tree of the key directories and what lives in each.
Source: code-structure.md (brownfield) or unit-of-work.md + application-design.md>

## Build and run
<The exact commands to install dependencies, build, run locally, and run tests.
Source: build-and-test/ instruction files (Construction phase).
At Inception time, use "TBD — see aidlc-docs/construction/build-and-test/ once
generated" if Construction hasn't run yet.>

## Key conventions
<Coding standards, patterns, naming, file-placement rules Claude should follow.
Source: nfr-design.md (coding standards section), functional-design.md patterns>

## Architecture decisions
<The 3-5 most load-bearing design choices and their rationale (not exhaustive —
just what an agent needs to avoid re-litigating settled decisions).
Source: application-design.md, requirements.md, architecture.md (brownfield)>

## AI-DLC documentation
All requirements, design decisions, architecture diagrams, and audit trail live in
`aidlc-docs/`. Key files for orientation:
- `aidlc-docs/aidlc-state.md` — current workflow stage and progress
- `aidlc-docs/inception/requirements/requirements.md` — functional + NFR requirements
- `aidlc-docs/inception/application-design/application-design.md` — component design
- `aidlc-docs/audit.md` — append-only record of every decision

## Notes for Claude Code
<Things an agent must know to avoid breaking the project:
- Files / directories never to touch
- Commands to run before committing (linting, formatting)
- Environment variables needed
- Any gotchas specific to this codebase
Source: build-instructions.md, nfr-design.md, workspace-detection.md findings>
```

### Optional sections (include when relevant)

- `## API reference` — if the project exposes a public API (source: api-documentation.md)
- `## Data model` — if there's a non-obvious data model (source: functional-design.md)
- `## Extension points` — if the project is designed to be extended

## Rules

- Write to `AGENTS.md` at the **project root**, never inside `aidlc-docs/`
- Keep it **scannable** — an agent should be able to orient in under 2 minutes
- Concrete over vague: real command names, real file paths, real framework names
- At Inception time, mark Construction-phase sections (`## Build and run`,
  `## Notes for Claude Code`) as "TBD — will be completed after Construction"
  rather than leaving them empty or omitting them
- At Construction time, **replace** the whole file — do not append
- Do NOT generate an HTML companion for `AGENTS.md` (it is a root-level steering
  file, not an aidlc artifact — the html-artifacts rule does not apply)
- Log the generation in `aidlc-docs/audit.md` with a timestamp
