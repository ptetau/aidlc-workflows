# HTML Artifact Generation

## MANDATORY: Write an HTML companion for every .md artifact

After writing **any** `.md` file under `aidlc-docs/`, immediately generate a
companion `.html` file alongside it by running:

```
python <script-path>/md_to_aidlc_html.py  <path-to-artifact.md>
```

Resolve `<script-path>` in this order (first that exists):
1. `aidlc-rules/scripts/` — project-local copy distributed with the rules
2. `.aidlc/aidlc-rules/scripts/`
3. `{SKILL_DIR}/scripts/` — if loaded from the global skill bundle

### What the HTML file is

A squiz-styled, self-contained single-page document with:
- **IBM Plex Mono/Sans** typography, dark phosphor terminal theme
- **Inline editing** — every section of the document is a live textarea; click to edit raw markdown
- **Copy JSON** button — exports *only changed sections* as a diff payload

### The diff JSON format (copy json output)

```json
{
  "file": "aidlc-docs/inception/requirements.md",
  "instructions": "Apply each change to the markdown file. For each entry in 'changes': locate the section whose heading matches 'section' and replace its body text with the 'current' value. The 'original' field is provided for context and verification.",
  "changes": [
    {
      "section": "## Functional Requirements",
      "original": "...original body text...",
      "current": "...edited body text..."
    }
  ]
}
```

When a user pastes this JSON back into their Claude Code prompt, apply each
change by finding the matching section heading in the file and replacing its
body text (content between that heading and the next same-or-higher-level
heading) with the `current` value.

### Scope

Generate HTML companions for **all** artifact `.md` files:
- `aidlc-docs/inception/` — requirements.md, stories.md, personas.md,
  architecture.md, components.md, unit-of-work.md, application-design/*.md, etc.
- `aidlc-docs/construction/` — per-unit functional-design.md, nfr-requirements.md,
  nfr-design.md, infrastructure-design.md, code files, build-and-test instructions
- `aidlc-docs/operations/` — any operations artifacts
- `aidlc-docs/audit.md` — NOT an HTML artifact (append-only log, do not generate HTML)
- `aidlc-docs/aidlc-state.md` — NOT an HTML artifact (machine state, do not generate HTML)

### Batch conversion

To generate HTML for all existing `.md` files in an aidlc project at once:

```bash
find aidlc-docs -name '*.md' \
  ! -name 'audit.md' \
  ! -name 'aidlc-state.md' \
  -exec python aidlc-rules/scripts/md_to_aidlc_html.py {} \;
```

On Windows:
```powershell
Get-ChildItem aidlc-docs -Recurse -Filter '*.md' |
  Where-Object { $_.Name -notin @('audit.md','aidlc-state.md') } |
  ForEach-Object { python aidlc-rules/scripts/md_to_aidlc_html.py $_.FullName }
```
