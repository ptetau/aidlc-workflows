# Workspace JSON Schemas

These are the canonical JSON shapes for the six documents the workspace server renders
(`aidlc-docs/workspace/<doc>.json`). When you generate or regenerate a covered document in
**html mode**, write conforming JSON here — this JSON is the source of truth, not the `.md`.
Match the shapes exactly; the UI is coupled to them.

All files are pretty-printed JSON (2-space). The server seeds defaults for any missing file.

**When you FIRST generate a covered doc**, also write the same content to
`aidlc-docs/workspace/.snapshot/<doc>.json`. That sets the ingest baseline to the generated state,
so the first `/aidlc ingest` after the user edits diffs cleanly against what you produced (rather
than treating every field as new).

---

## project.json
```json
{ "name": "billing-service", "repo": "acme/billing-service", "branch": "main", "version": "v3" }
```

## clarify.json
The requirement prose is **split into segments**; segments that are ambiguous carry an `amb` id
that links to a question. Answering a question turns its highlighted phrase green in the UI.
```json
{
  "requirement": [
    { "t": "Build a usage-based billing service that charges customers " },
    { "amb": "q-cadence", "t": "at the end of each cycle" },
    { "t": ". Customers can view invoices…" }
  ],
  "questions": [
    { "id": "q-cadence", "n": "Q1", "topic": "Billing cadence",
      "text": "What defines \"the end of each cycle\"?",
      "kind": "radio",                                  // radio | multi | text
      "options": ["Calendar month, UTC midnight", "Per-customer anniversary"],
      "answer": 0,                                       // radio: index|null · multi: [idx] · text: string
      "suggest": { "label": "config/billing.yaml › cycle", "value": "Calendar month, UTC midnight" } }
  ],
  "notes": [ { "id": "n1", "kind": "CONSTRAINT", "text": "All money math in integer cents." } ]
}
```
Generation: keep `requirement` segments concatenating to the exact requirement text. Every `amb`
id must have a matching question `id`. `kind` drives the input; set `answer` to the resolved value
(or null/empty if unresolved). `suggest` is optional (a recommended value from elsewhere).

clarify also carries the **structured requirements** that result from clarification (the Requirements
tab) — populate these from `requirements.md`:
```json
{
  "functional": [ { "id": "FR-001", "text": "The system must …" } ],
  "nfrs":       [ { "category": "Performance", "requirement": "p99 latency", "target": "< 200ms" } ],
  "decisions":  [ { "decision": "Money representation", "choice": "integer cents", "rationale": "…" } ],
  "scope":      { "in": ["…"], "out": ["…"] }
}
```

## stories.json
```json
{
  "intent": "One-sentence business intent.",
  "epics": [ { "id": "e1", "title": "Usage aggregation", "color": "var(--blue)" } ],
  "personas": [
    { "id": "p1", "name": "Priya · Finance", "role": "finance", "goals": "Reconcile every cent", "frustrations": "Manual CSV exports" }
  ],
  "cards": [
    { "id": "s1", "epic": "e1", "code": "US-AGG-001", "title": "Ingest events idempotently",
      "asA": "operator", "iWant": "duplicate events ignored", "soThat": "totals stay correct",
      "priority": "Must", "roles": ["admin"],
      "criteria": ["Given a duplicate event id\nWhen received\nThen it is ignored"],
      "human": false, "done": false, "points": 5 }
  ]
}
```
Agents execute most stories; humans specify them. `criteria` are Gherkin strings (the UI validates
Given/When/Then). **Readiness is derived, not stored**: `done:true` → done; else all criteria valid
→ ready (for an agent); else needs detail. `human: true` marks the few stories needing a person.
`code` is the canonical story id (e.g. `US-AGG-001`); `priority` ∈ Must/Should/Could/Won't;
`asA/iWant/soThat` are the narrative; `roles` are the persona `role`s the story serves (the RBAC
map / "Map" tab). `personas` carry `name/role/goals/frustrations`. `points` optional. `epic`
references `epics[].id`. There is **no** sprint board / column model.

## arch.json
```json
{
  "nodes": [ { "id": "gw", "type": "api", "label": "API Gateway", "x": 80, "y": 70,
               "fields": [["route", "/v1/usage"], ["auth", "mTLS"]],
               "methods": [ { "name": "ingest", "input": "UsageEvent[]", "output": "Ack", "purpose": "accept events" } ] } ],
  "edges": [ { "from": "gw", "to": "meter" } ],
  "units": [
    { "id": "u1", "name": "Usage Aggregation", "responsibilities": "Ingest & aggregate usage",
      "workload": "service", "datastore": "Postgres", "port": "8081", "buildOrder": 1,
      "components": ["gw", "meter", "agg"], "stories": ["US-AGG-001", "US-AGG-002"] }
  ]
}
```
`type` ∈ `api | db | ui | queue`. `x`/`y` are canvas pixel coords. `fields` is an array of
`[key, value]` pairs (node config). `methods` are typed component methods (name/input/output/purpose).
`edges` connect node ids (data flow). `units` are deployable units of work: each groups `components`
(node ids), owns a `buildOrder` + deployment profile (`workload`/`datastore`/`port`), and lists the
story ids it delivers (`stories` — the **story→unit map**).

## infra.json
```json
{
  "regions": [ { "id": "us-east", "label": "us-east-1", "on": true } ],
  "resources": [
    { "id": "db", "type": "db", "label": "Postgres (primary)", "multiAz": true, "public": true, "encrypted": false }
  ],
  "notes": { "db": "Override rationale text." }
}
```
`type` ∈ `compute | lb | db | cache`. Per-type fields: compute `{min,max,cpu,public}`,
lb `{tls,public}`, db `{multiAz,public,encrypted}`, cache `{public,encrypted}`. The UI runs a live
security validator over these (e.g. public+unencrypted db = HIGH). `notes` maps resource id → text.

## tests.json
```json
{
  "types": ["Unit", "Integration", "UI / E2E"],
  "components": [ { "id": "agg", "name": "Aggregator" } ],
  "cells": {
    "agg-0": { "status": "pass", "code": "it('sums usage', () => { … })" },
    "agg-1": { "status": "none", "code": "" }
  },
  "summary": {
    "builds": [ { "component": "Aggregator", "build": "success", "coverage": 92 } ],
    "businessRulesVerified": ["BR-001: money in integer cents"],
    "readyForOperations": false
  }
}
```
`cells` keys are `"<componentId>-<typeIndex>"`. `status` ∈ `pass | fail | none` (the agent sets it
from the real build-and-test run; the UI does not execute tests). `summary` is the build-and-test
summary: per-component `builds` (`build` ∈ success/fail/pending, `coverage` %), the `businessRulesVerified`
list, and the `readyForOperations` gate.

## steering.json
```json
{
  "groups": [
    { "id": "style", "title": "Code style", "rules": [
      { "id": "r1", "label": "Semicolons required", "on": true, "kind": "toggle" },
      { "id": "r3", "label": "Max line length", "on": true, "kind": "slider", "value": 100, "min": 60, "max": 140, "step": 10 }
    ] }
  ],
  "exceptions": [ { "id": "x1", "rule": "Max line length", "scope": "src/migrations/**", "note": "SQL strings exceed 100 cols" } ],
  "sample": "function calc_total(items){ … }"
}
```
`kind` ∈ `toggle | slider`. `sample` is the code shown in the policy Playground. This document maps
to `AGENTS.md` + steering rules — keep them consistent when you regenerate either.
