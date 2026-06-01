---
name: aidlc
description: AWS AI-DLC (AI-Driven Development Life Cycle) adaptive software-development workflow. Invoke explicitly with /aidlc when starting or continuing structured, gated development work — requirements → planning → design → code generation → build & test, with approval checkpoints and a full audit trail. Use for greenfield builds, brownfield changes, or resuming an in-progress aidlc-docs/ project.
disable-model-invocation: true
---

# AI-DLC Skill

This skill runs the AWS **AI-Driven Development Life Cycle** — an adaptive, gated workflow that takes a software request from requirements through planning, design, code generation, and build & test, documenting every decision under `aidlc-docs/`.

It is **explicit-only**: it activates when the user types `/aidlc`, not automatically. Once invoked, drive the workflow for the user's request until it completes or the user stops it.

## Sub-commands (check first — before loading WORKFLOW.md)

If the invocation includes a sub-command word, handle it immediately and stop:

| Invocation | Action |
|---|---|
| `/aidlc update html` | Switch project to HTML doc mode — read `common/update-mode.md` |
| `/aidlc update markdown` | Switch project to markdown-only mode — read `common/update-mode.md` |

Sub-command rule file path: `aidlc-rules/aws-aidlc-rule-details/common/update-mode.md` (resolve via the same rule-details path logic as other common rules)

If no sub-command is present, proceed to the main workflow below.

---

## How to run it

1. **Load the orchestration manual.** Read this skill's `WORKFLOW.md` — it is the complete stage-by-stage workflow (Inception → Construction → Operations), the approval-gate rules, the audit/state-logging requirements, and the directory structure. Follow it exactly; it OVERRIDES default development behavior for the duration of this `/aidlc` session.

2. **Load the rule-detail files on demand.** `WORKFLOW.md` instructs you to read specific rule files at each stage (e.g. `common/process-overview.md`, `inception/workspace-detection.md`). These live in this skill's bundled `aidlc-rule-details/` folder. Resolve paths per the **"MANDATORY: Rule Details Loading"** section in `WORKFLOW.md`:
   - **Primary (bundled):** `C:/Users/User/.claude/skills/aidlc/aidlc-rule-details/` — use this absolute path with the Read tool (the working directory is the user's project, not this skill folder).
   - **Project-local override:** if the project has its own `.aidlc-rule-details/` (or `.aidlc/…`, `.kiro/…`, `.amazonq/…`), prefer it — it may be more current for that project.

3. **Show the welcome message once**, then begin with Workspace Detection, exactly as `WORKFLOW.md` directs.

## Bundled files

```
aidlc/
├── SKILL.md                 # this router
├── WORKFLOW.md              # full AI-DLC orchestration manual (read first)
├── quiz-skill.md            # bundled /quiz skill — card format for all Q&A
├── scripts/
│   └── md_to_aidlc_html.py  # artifact → HTML converter
└── aidlc-rule-details/      # per-stage rule files, read on demand
    ├── common/  inception/  construction/  extensions/  operations/
```

## Notes

- **Documentation vs. code:** all AI-DLC artifacts go under `aidlc-docs/` in the user's project; application code goes at the project root — never in `aidlc-docs/`. See the Directory Structure section of `WORKFLOW.md`.
- **Audit trail:** append to `aidlc-docs/audit.md` (never overwrite it) per `WORKFLOW.md`.
- **Resuming:** if `aidlc-docs/aidlc-state.md` exists in the project, resume from the recorded stage (see `common/session-continuity.md`).
