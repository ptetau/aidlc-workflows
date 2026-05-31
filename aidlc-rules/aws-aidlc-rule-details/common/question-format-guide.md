# Interview Format Guide (quiz-style inline interview)

## MANDATORY: How AI-DLC gathers content from the user

AI-DLC gathers requirements, design decisions, and any other clarifying content **by interviewing the user inline, one question at a time**, in the style of the `/quiz` skill — a compact ASCII "question card" per turn, a single-letter reply, an echoed confirmation, then the next card. This is how the content for the SRS, SDD, and all other documents is elicited.

### ⚠️ OVERRIDE (read first)
This guide **SUPERSEDES** any instruction elsewhere in the AI-DLC rule set that says to:
- "Create a `{phase}-questions.md` file", "embed questions using `[Answer]:` tag format", "wait for the user to complete all `[Answer]:` tags", or
- "Never ask questions in chat".

Wherever a stage rule (requirements-analysis, user-stories, application-design, functional-design, nfr-requirements, nfr-design, infrastructure-design, units-generation, workflow-planning, etc.) tells you to put questions in a file and wait, **instead conduct the inline interview defined below, then record the answers** into that stage's document(s) and into `audit.md`. The detailed option-quality, "Other"-option, and contradiction/ambiguity rules below still apply — they now govern the *content* of interview cards, not a file.

The only time you fall back to a rendered question **file** is the escalation case (see "When to escalate to a file" below).

---

## The interview protocol

### One question per turn — always
Render exactly **one** question per message as a fenced code-block card, followed by a one-sentence plain-prose reply hint. Never stack two cards in one message. Wait for the reply before the next card.

### The question card

````
```
┌─ aidlc · requirements · 01/05 ───────────────────────┐
│ [?] What is the primary user authentication method?  │
│     why it matters: drives security + data model     │
└──────────────────────────────────────────────────────┘

  A · password      Username and password
  B · social        Google / Facebook / GitHub OAuth
  C · sso           Enterprise SSO (SAML / OIDC)
  D · mfa           Multi-factor (password + second factor)
  X · other         (reply: X, then describe)

  // reply: A | B | C | D | X   (optional: add a note after the letter)
```
````

Then one plain sentence under the card, e.g.: *"Pick A–D, or `X: <your answer>` — add a note after any letter if you want."*

### Card rules (match /quiz exactly)
1. **Always a fenced code block** — monospace is the aesthetic. Box-drawing chars (`┌─┐│└┘`) for the header; plain ASCII for options.
2. **Top marker**: `aidlc · <stage> · NN/NN`, lowercase. The counter shows progress within the current round; increment as you go.
3. **`[?]` for open, `[✓]` for resolved.**
4. **Options as `A · short-label    explanation`**, two-space indent, ≤~70 chars wide so it survives mobile. Wrap with continued indent.
5. **Optional `why it matters:`** line — one short clause, only when the consequence helps the user choose.
6. **`// reply:` hint** at the bottom of every card.
7. **"Other" is MANDATORY as the LAST option**, rendered as `X · other  (reply: X, then describe)`. Free-text questions are a card with only the `X · other` option.
8. **No markdown formatting inside the card** (no bold/italic) and **no emojis** except as literal sample content.

### The rhythm
After each reply, echo a one-line `[✓]` confirmation for the just-answered question, then *immediately* render the next card **in the same message**:

```
[✓] 01 auth method → C · sso
```
…then the `02/05` card.

### Final resolved view
After the LAST question in the round, restate the whole set so the user can catch a mistake:

```
[✓] 01 auth method  → C · sso
[✓] 02 data store    → A · postgres   (note: managed RDS)
[✓] 03 deploy target → B · serverless
```

Then one plain sentence: *"Going with these — say `wait` if anything's wrong, otherwise I'll record them and continue."*

### Reply parsing (be permissive)
Accept `A` / `a` / `Option A`; `B, with notes: …`; `B (…)`; `skip` / `you decide` / `n/a` (explicit skip → you choose and say so); free prose (match to the closest option and confirm in your echo); and run-on answers like `1c2a3b` (parse the run, echo all `[✓]` lines in order). Never ask the same question twice — if a reply is ambiguous, ask **one** plain-prose follow-up, not another card.

---

## Question content rules (still mandatory)

### Option quality
- Minimum 2 meaningful options + `X · other`; typically 3–4; max ~5 + other.
- **Only include meaningful options — never invent options to fill A/B/C/D slots.**
- Options must be mutually exclusive, realistic, specific.
- A free-text question is fine — render it as a card whose only option is `X · other`.

### Contradiction & ambiguity detection (MANDATORY)
After a round, check answers for logical conflicts and unclear responses:
- Scope mismatch ("bug fix" but "entire codebase affected")
- Risk mismatch ("low risk" but "breaking changes")
- Timeline/impact mismatch ("quick fix" but "multiple subsystems")
- Answers that could fit multiple classifications, or lack specificity.

If found, resolve **inline**: render a short follow-up card (or, for a single straggler, one plain-prose question) that names the conflict — e.g. *"Q01 said 'bug fix' but Q03 said 'system-wide' — which holds?"* — and offers options that resolve toward each reading plus a middle ground. **Do not proceed until contradictions are resolved or the user explicitly says to proceed.**

---

## Recording answers (this is what makes it AI-DLC, not just /quiz)

The interview is the input mechanism; the documents are still the durable output. After each round:
1. **Audit (mandatory)**: append the user's complete raw replies to `aidlc-docs/audit.md` with an ISO timestamp (verbatim — never summarized), per the audit rules in the workflow.
2. **Synthesize into the stage doc**: fold the answers into the document that stage produces (e.g. `requirements.md`, `functional-design.md`), not a throwaway file.
3. **Optional transcript artifact**: for traceability you MAY also write the resolved `[✓]` set to `aidlc-docs/<phase>/<phase>-interview.md` (the cards + chosen answers + notes). Recommended for comprehensive depth; skip for minimal depth.

Internally, track answers in the `/quiz` ↔ `/squiz` JSON shape (`{ spec, generatedAt, decisions:[{id,question,choice,notes}], summary }`) so a round can be exported if the user asks.

---

## Rounds, batching, and depth
- Ask **≤ 7 cards per round** (the /quiz cap). If a stage needs more (comprehensive depth often needs 10+), run **multiple rounds**, most load-bearing questions first, pausing at the end of each round for the resolved-view confirmation before the next round.
- Match volume to depth (see `depth-levels.md`): minimal → few/no cards; standard → one round; comprehensive → multiple rounds.

## When to escalate to a file (the /squiz fallback)
Switch from inline cards to a rendered question **file** (the legacy `aidlc-docs/.../<phase>-questions.md` with `[Answer]:` tags, or a `/squiz` document) only when:
- There are **8+ tightly-coupled questions** the user benefits from seeing all at once, or
- Options need **visual previews** (wireframes, sample layouts, diagrams to compare), or
- The user explicitly asks for "the doc / the form / a file I can fill in offline".

Don't auto-escalate — offer it in one sentence and let the user choose: *"That's a lot of coupled choices — want them as one fill-in doc instead of card-by-card? Otherwise I'll keep interviewing."* When you do escalate, the `[Answer]:`-tag file format and its validation rules (one `[Answer]:` per question, "Other" last, read-and-extract on completion) still apply.

---

## ⛔ GATE behavior
A stage's "await answers" gate is satisfied when the interview round(s) are complete, the final resolved view is confirmed by the user (no `wait`), and the answers are recorded per the Recording section. Only then proceed past the gate.

## Summary
- ✅ Interview inline, **one quiz-style card per turn**; echo `[✓]`, then next card.
- ✅ "Other" (`X`) is the **last option on every card**; only meaningful options otherwise.
- ✅ Detect contradictions/ambiguities each round; resolve inline before proceeding.
- ✅ Record raw answers → `audit.md`; synthesize → the stage doc; optional `*-interview.md` transcript.
- ✅ ≤7 cards/round; multiple rounds for deep stages; offer the file fallback for big/visual sets.
- ❌ Never stack two cards in one message.
- ❌ Never default to a `{phase}-questions.md` file — that's the escalation fallback, not the norm.
- ❌ Never proceed with unresolved contradictions or an unconfirmed resolved view.
