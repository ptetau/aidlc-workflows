# Security Baseline — Opt-In

**Extension**: Security Baseline

## Opt-In Prompt

The following question is automatically included in the Requirements Analysis interview when this extension is loaded. Render it as an inline quiz-style card (per `common/question-format-guide.md`):

```markdown
## Question: Security Extensions
Should security extension rules be enforced for this project?

A · yes     Enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B · no      Skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X · other   (reply: X, then describe)
```
