# Interview Format Guide

## Card format — delegate to the bundled quiz skill

All interactive Q&A in AI-DLC uses the `/quiz` skill card format. Before
running any interview, read the bundled quiz skill definition:

**Primary (global skill bundle):**
`C:/Users/User/.claude/skills/aidlc/quiz-skill.md`

**Project-local fallback (check in order, use first that exists):**
- `aidlc-rules/quiz-skill.md`
- `.aidlc/aidlc-rules/quiz-skill.md`

The quiz skill defines the complete card format, rhythm, reply parsing, keyboard
nav, final resolved view, and escalation to `/squiz`. Follow it exactly.

**One aidlc-specific modification to the card label:**
Use `aidlc · <stage> · NN/NN` instead of `quiz · NN/NN`:

```
┌─ aidlc · requirements · 01/05 ───────────────────────┐
│ [?] What is the primary user authentication method?  │
│     why it matters: drives security + data model     │
└──────────────────────────────────────────────────────┘
```

---

## ⚠️ OVERRIDE (read first)

This guide **SUPERSEDES** any instruction elsewhere in the AI-DLC rule set
that says to:
- "Create a `{phase}-questions.md` file", "embed questions using `[Answer]:` tag
  format", "wait for the user to complete all `[Answer]:` tags", or
- "Never ask questions in chat".

Wherever a stage rule tells you to put questions in a file and wait,
**instead conduct the inline interview, then record the answers** into that
stage's document(s) and into `audit.md`.

---

## Recording answers (aidlc-specific — not in the quiz skill)

The interview is the *input* mechanism; the documents are the durable output.
After each round:

1. **Audit (mandatory):** append the user's complete raw replies to
   `aidlc-docs/audit.md` with an ISO timestamp (verbatim — never summarized).
2. **Synthesize into the stage doc:** fold answers into the document the stage
   produces (e.g. `requirements.md`, `functional-design.md`).
3. **Optional transcript:** you MAY also write the resolved `[✓]` set to
   `aidlc-docs/<phase>/<phase>-interview.md` for traceability.

Track answers internally in the `/quiz` JSON shape
(`{ spec, generatedAt, decisions:[{id,question,choice,notes}], summary }`)
so a round can be exported if the user asks.

---

## Rounds, batching, and depth

- ≤ 7 cards per round (the quiz skill cap). Run multiple rounds for stages that
  need more; pause at each round's resolved-view confirmation.
- Match volume to depth (`depth-levels.md`): minimal → few/no cards; standard
  → one round; comprehensive → multiple rounds.

## When to escalate to a file (the `/squiz` fallback)

Switch from inline cards to a rendered question file only when:
- There are **8+ tightly-coupled questions** the user benefits from seeing
  all at once, or
- Options need **visual previews**, or
- The user explicitly asks for "the doc / the form / a file I can fill in".

Offer it in one sentence and let the user choose.

---

## ⛔ GATE behaviour

A stage's "await answers" gate is satisfied when the interview round(s) are
complete, the final resolved view is confirmed (no `wait`), and answers are
recorded. Only then proceed past the gate.

## Summary

- ✅ Follow the bundled quiz skill for all card rendering and reply parsing.
- ✅ Label: `aidlc · <stage> · NN/NN` (not `quiz · NN/NN`).
- ✅ Record raw answers → `audit.md`; synthesize → the stage doc.
- ✅ ≤ 7 cards/round; multiple rounds for deep stages.
- ❌ Never default to a `{phase}-questions.md` file — escalation fallback only.
- ❌ Never proceed with unresolved contradictions or an unconfirmed resolved view.
