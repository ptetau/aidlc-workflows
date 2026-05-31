---
name: aidlc
description: AWS AI-DLC (AI-Driven Development Life Cycle) adaptive software-development workflow. Invoke explicitly with /aidlc when starting or continuing structured, gated development work — requirements → planning → design → code generation → build & test, with approval checkpoints and a full audit trail. Use for greenfield builds, brownfield changes, or resuming an in-progress aidlc-docs/ project.
disable-model-invocation: true
---

# AI-DLC Skill

This skill runs the AWS **AI-Driven Development Life Cycle** — an adaptive, gated workflow that takes a software request from requirements through planning, design, code generation, and build & test, documenting every decision under `aidlc-docs/`.

It is **explicit-only**: it activates when the user types `/aidlc`, not automatically. Once invoked, drive the workflow for the user's request until it completes or the user stops it.

## How to run it

1. **Load the orchestration manual.** Read `aidlc-rules/aws-aidlc-rules/core-workflow.md` — it is the complete stage-by-stage workflow (Inception → Construction → Operations), the approval-gate rules, the audit/state-logging requirements, and the directory structure. Follow it exactly; it OVERRIDES default development behavior for the duration of this `/aidlc` session.

2. **Load the rule-detail files on demand.** `core-workflow.md` instructs you to read specific rule files at each stage (e.g. `common/process-overview.md`, `inception/workspace-detection.md`). Resolve those paths against the first rule-details location that exists, checked in this order:
   - `aidlc-rules/aws-aidlc-rule-details/` (this repository's bundled rules)
   - `.aidlc/aidlc-rules/aws-aidlc-rule-details/` (project-local, AI-assisted setup)
   - `.aidlc-rule-details/` (project-local: Cursor, Cline, Claude Code, GitHub Copilot, OpenAI Codex)
   - `.kiro/aws-aidlc-rule-details/` (project-local, Kiro IDE and CLI)
   - `.amazonq/aws-aidlc-rule-details/` (project-local, Amazon Q Developer)

   A project-local copy, if present, may be more current for that project — prefer it over the repository copy when it exists.

3. **Show the welcome message once**, then begin with Workspace Detection, exactly as `core-workflow.md` directs.

## Interview format (quiz-style)

This skill gathers all clarification by **interviewing the user inline, one quiz-style question card per turn** — not by creating `{phase}-questions.md` files and waiting for `[Answer]:` tags. See `aidlc-rules/aws-aidlc-rule-details/common/question-format-guide.md` for the complete interview protocol (ASCII card, single-letter reply, `[✓]` echo, contradiction detection, final resolved view, and the file/`/squiz` fallback for 8+ coupled or visual questions).

## Notes

- **Documentation vs. code:** all AI-DLC artifacts go under `aidlc-docs/` in the user's project; application code goes at the project root — never in `aidlc-docs/`. See the Directory Structure section of `core-workflow.md`.
- **Audit trail:** append to `aidlc-docs/audit.md` (never overwrite it) per `core-workflow.md`.
- **Resuming:** if `aidlc-docs/aidlc-state.md` exists in the project, resume from the recorded stage (see `common/session-continuity.md`).
