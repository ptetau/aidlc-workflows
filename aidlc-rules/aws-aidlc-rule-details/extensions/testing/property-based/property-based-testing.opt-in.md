# Property-Based Testing — Opt-In

**Extension**: Property-Based Testing

## Opt-In Prompt

The following question is automatically included in the Requirements Analysis interview when this extension is loaded. Render it as an inline quiz-style card (per `common/question-format-guide.md`):

```markdown
## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A · yes      Enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B · partial  Enforce PBT rules only for pure functions and serialization round-trips (limited algorithmic complexity)
C · no       Skip all PBT rules (simple CRUD, UI-only, or thin integration layers with no significant business logic)
X · other    (reply: X, then describe)
```
