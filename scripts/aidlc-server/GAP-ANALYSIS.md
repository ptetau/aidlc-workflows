# aidlc-server ↔ vanilla AI-DLC — Gap Analysis

Question: can the JSON/web workspace (`aidlc-server`, six workspaces) support everything the
markdown flow does? **Short answer: no — by design it covers a curated 6-document subset, and it
does not implement the workflow *engine*.** This doc enumerates the gaps so we can decide how far to
close them.

Two things to separate up front:
- **Coexistence is intact.** In html mode the agent still writes *all* markdown artifacts and runs
  the full workflow; only 6 docs also become canonical JSON. Non-covered `.md` still get a static
  viewer via `md_to_aidlc_html.py`. So nothing is *lost* at the file level — the gaps are about what
  the **server/UI represents and lets you edit/drive**, vs. what stays markdown-only.
- **Vanilla = 51 artifacts + 10 mechanics.** The server models 6 documents and 0 mechanics.

Legend: ✅ full · 🟡 partial/lossy · ⛔ none.

---

## 1. The six "covered" docs — fidelity gaps

Each workspace maps to a real artifact but represents far less than the artifact contains.

| Workspace (JSON) | Vanilla artifact(s) | Coverage | What the JSON does NOT represent |
|---|---|---|---|
| **clarify** | `requirements.md` (+ verification Qs) | 🟡 | The requirement *document* is highly structured: Intent Analysis table, **FR-* list with IDs**, **NFR target tables**, API Design Standards, Technology Stack, **Architectural Decisions table**, MVP In/Out scope, **Open Decisions** table. clarify models only segmented requirement prose + clarifying Q&A + notes. **FRs/NFRs/decisions/scope have no structured home.** |
| **stories** | `stories.md` + `personas.md` | 🟡 | No **personas** at all (goals/frustrations/tech-comfort/key-endpoints). No **"As a… I want… so that…"** narrative (only title). No **story-persona RBAC matrix**. No canonical **US-* IDs** (uses `s1`). No **priority** (Must/Should). |
| **arch** | `application-design/*` **+ unit-of-work/*** | 🟡 | A loose node/edge graph + freeform `[k,v]`. Missing: **component methods** (typed I/O), responsibilities/interfaces, **endpoint→role** map, **services** layer, **data-ownership**, communication patterns — and the **entire units-of-work layer** (units, build order, deployment profile, **unit→story map**, unit deps). The story→unit map is a primary traceability artifact and is **absent**. |
| **infra** | `infrastructure-design/*` (+ `nfr-design/*`) | 🟡 | A generic cloud-resource set + security validator. Missing: **logical→physical mapping**, deployment topology/rationale, multi-cloud, **per-unit** infra (vanilla is per-unit; server is project-level), and the upstream `nfr-design` patterns/logical-components. |
| **tests** | `build-and-test/*` | 🟡 | A component×type status/script matrix. Missing: **build instructions** (prereqs/commands/troubleshooting), **test scenarios + coverage targets**, and the **build-and-test-summary** (per-service build status, coverage %, **business-rules-verified**, ready-for-operations). |
| **steering** | `AGENTS.md` (+ "steering rules") | 🟡 | Rule toggles/exceptions are a *new* governance concept not in vanilla. It does **not** represent AGENTS.md content: project overview, tech stack, **repo structure**, build & run, conventions prose, architecture decisions, doc pointers. |

**Net:** all six are simplified editing surfaces, not faithful representations. The biggest fidelity
losses: requirements FR/NFR/decisions, personas + RBAC matrix, the units-of-work + story→unit map,
the build-and-test summary, and AGENTS.md content.

---

## 2. Documents with NO workspace at all (⛔)

- **Reverse-engineering set** (brownfield): business-overview, architecture, code-structure (+ file
  inventory), api-documentation, component-inventory, technology-stack, dependencies,
  code-quality-assessment, timestamp. (9 docs.)
- **personas.md** (see stories above).
- **All plan files** — `execution-plan.md`, `*-assessment.md`, `*-generation-plan.md`,
  `*-code-generation-plan.md`. These are the **checkbox execution engine** (see §3.2).
- **Functional design** — `business-logic-model.md`, **`business-rules.md` (BR-* → FR-*)**,
  **`domain-entities.md` (typed fields, FKs, invariants)**, `frontend-components.md`.
- **NFR** — `nfr-requirements.md`, `tech-stack-decisions.md`, `nfr-design/*`.
- **Code summaries** — `construction/{unit}/code/*`.
- **Operations** — placeholder (no vanilla artifacts yet).
- **audit.md**, **aidlc-state.md** — see §3.

domain-entities + business-rules are highly structured and arguably higher-value to edit than some
covered docs — yet have no home.

---

## 3. Workflow *engine* gaps — functionality, not documents

The markdown flow's real power is mechanics. The server implements none of these:

1. **Approval gates** ⛔ — one gate per stage ("Request Changes / Approve & Continue"), recorded in
   audit + state. The server has Save→ingest→digest, which is a *different* model with **no gating,
   no approve/continue, no stage boundaries**.
2. **Plan / checkbox execution engine** ⛔ — Part 1 plans with `[ ]/[x]` steps that *drive*
   Part 2 generation ("only execute what's written in the plan"). This is the core execution engine.
   The server has **no plan or checkbox surface** at all.
3. **State machine / stage progress** ⛔ — `aidlc-state.md`: current stage, per-stage EXECUTE/SKIP
   checkboxes, lifecycle phase. The server's `project.json` holds only name/repo/branch/version —
   **no stage state, no progress, no current-stage**.
4. **Extensions** ⛔ — opt-in config + per-stage enforcement + compliance summaries. No representation.
5. **Audit trail** 🟡 — vanilla `audit.md` is a **verbatim** append-only interaction log. The server's
   `digests.ndjson` is a *change-summary* ledger — overlapping idea, different purpose (not verbatim,
   only save/ingest events, not every interaction).
6. **Interview / Q&A engine** 🟡 — the quiz interview is the elicitation loop (answers → audit +
   synthesized into docs, ambiguity follow-ups, GATE). clarify shows a *static* Q&A editor; the live
   interview is agent-side. (Arguably fine to leave agent-side.)
7. **Traceability** 🟡 — FR→US→unit→component→code ID chain. The server has loose epic/story links and
   arch edges, but **no FR/US/BR IDs, no story→unit map, no component→method** — the chain is broken.
8. **Brownfield / reverse-engineering** ⛔ — detection + RE artifacts + modify-in-place. None.
9. **Workflow changes** ⛔ — add/skip/restart stage, change depth, split units, with archive+reset+log.
   No server analog.
10. **Content validation / depth-levels / diagrams** 🟡 — Mermaid/ASCII diagrams, code-org trees, and
    fenced command blocks are load-bearing freeform content the structured schemas can't hold (arch's
    own graph is the one exception).

---

## 4. Permutation gaps

- **Brownfield**: entire RE surface missing (§2); arch/infra don't distinguish modify-in-place.
- **Multi-unit construction**: vanilla is **per-unit** (each unit has its own functional-design/nfr/
  infra/code). The server is **single, project-level** for arch/infra/tests — no per-unit dimension.
- **Extensions on/off**: no enablement or compliance surface.
- **Skipped stages**: no EXECUTE/SKIP view; the server always shows all 6 regardless of what the
  project actually ran.
- **UI projects**: `frontend-components.md` unrepresented (arch has a `ui` node type only).

---

## 5. What the server already preserves (so we don't over-build)

- The agent still authors **every** markdown artifact and runs the full gated workflow — the server
  is additive, not a replacement.
- Non-covered `.md` already have a viewer (`md_to_aidlc_html.py`), so *viewing* any artifact works.
- The 6 covered docs round-trip JSON↔md losslessly (`/aidlc export` ↔ `adopt`).
- `digests.ndjson` gives a partial audit/activity view.

So "vanilla functionality" is preserved **at the file level today**. The gap is purely in what the
*server UI* surfaces, edits, and drives.

---

## 6. Recommendation — tiered, pick a target

Full 1:1 parity (a bespoke rich workspace for all 51 artifacts + a UI engine for gates/plans/state)
is a very large build and partly redundant (the agent already drives the engine via markdown).
Suggested tiers:

**P0 — Make the workspace honest about the project (small, high value)**
- Surface **state & progress** read from `aidlc-state.md`: current phase/stage, per-stage EXECUTE/
  SKIP/Done, extension config. (Nav already groups by phase — light it up with real status.)
- Only show workspaces for stages the project actually ran; mark skipped/not-yet-reached.
- Add a **generic document tab** that lists *all* `aidlc-docs/*.md` (RE, FD, NFR, plans, summaries)
  rendered read-only via the existing converter — so the workspace is a complete window, not just 6.

**P1 — Close the highest-value fidelity gaps in the 6**
- clarify: add FR/NFR/decisions/scope sections (or a structured requirements sub-view).
- stories: add personas, narrative, US-* IDs, priority, the RBAC matrix.
- arch: add the **units-of-work + story→unit map** (the missing traceability spine) and component
  methods.
- tests: add the build-and-test **summary** (status + coverage + BR-verified).
- steering: represent real **AGENTS.md** content alongside the rule toggles.

**P2 — Engine surfaces & editing for the rest (large)**
- Editable workspaces/schemas for domain-entities, business-rules, NFR, plans-as-checklists.
- A **plan/checkbox** view and **approval-gate** affordances in the UI.
- Brownfield RE surface; per-unit dimension for construction docs; extensions compliance view.
- A verbatim **audit** view distinct from digests.

**Explicitly probably-not-worth-it**: replicating the markdown-authoring/diagram/command-block
freeform content as structured fields; the agent + markdown remain better for those.

---

## 7. One-line verdict

The server is an excellent **editing surface for a curated subset** and a clean **save→ingest loop**
— but it is *not* a parity replacement for vanilla aidlc's documents or its gate/plan/state engine.
Closing the gap is a product-scope choice (P0 → P2 above), not a quick fix.
