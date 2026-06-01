// convert.go — two-way conversion between workspace JSON and markdown.
//
// Markdown produced by `export` is human-readable (headings, lists, tables) AND carries a
// canonical data block as a trailing HTML comment:
//
//	<!-- aidlc:<doctype> v1
//	{ ...the exact JSON... }
//	-->
//
// `import` reads that block, so JSON -> md -> JSON is a lossless, deterministic round-trip. The
// comment is invisible in rendered markdown (GitHub etc.), keeping the visible doc clean. This is
// the canonical path used by `/aidlc export` and (when the block is present) `/aidlc adopt`.
package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

const dataMarker = "<!-- aidlc:"

// renderMarkdown returns readable markdown for a doc plus the canonical data block.
func renderMarkdown(docType string, data any) (string, error) {
	var b strings.Builder
	switch docType {
	case "project":
		renderProject(&b, asMap(data))
	case "clarify":
		renderClarify(&b, asMap(data))
	case "stories":
		renderStories(&b, asMap(data))
	case "arch":
		renderArch(&b, asMap(data))
	case "infra":
		renderInfra(&b, asMap(data))
	case "tests":
		renderTests(&b, asMap(data))
	case "steering":
		renderSteering(&b, asMap(data))
	default:
		return "", fmt.Errorf("unknown doc type %q", docType)
	}
	// canonical data block (deterministic: encoding/json sorts map keys)
	canon, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", err
	}
	b.WriteString("\n")
	b.WriteString(dataMarker + docType + " v1\n")
	b.Write(canon)
	b.WriteString("\n-->\n")
	return b.String(), nil
}

// parseMarkdown extracts the canonical data block written by renderMarkdown.
func parseMarkdown(md string) (docType string, data any, err error) {
	i := strings.LastIndex(md, dataMarker)
	if i < 0 {
		return "", nil, fmt.Errorf("no aidlc data block found (not an exported workspace doc)")
	}
	rest := md[i+len(dataMarker):]
	nl := strings.IndexByte(rest, '\n')
	if nl < 0 {
		return "", nil, fmt.Errorf("malformed data block header")
	}
	header := strings.TrimSpace(rest[:nl]) // "<doctype> v1"
	docType = strings.Fields(header)[0]
	body := rest[nl+1:]
	end := strings.LastIndex(body, "-->")
	if end < 0 {
		return "", nil, fmt.Errorf("unterminated data block")
	}
	jsonText := strings.TrimSpace(body[:end])
	if err := json.Unmarshal([]byte(jsonText), &data); err != nil {
		return "", nil, fmt.Errorf("data block is not valid JSON: %w", err)
	}
	if !isDoc(docType) {
		return "", nil, fmt.Errorf("unknown doc type %q in data block", docType)
	}
	return docType, data, nil
}

// ---------------- readable renderers (defensive; round-trip rides on the data block) ----------------

func renderProject(b *strings.Builder, m map[string]any) {
	b.WriteString("# Project\n\n")
	for _, k := range []string{"name", "repo", "branch", "version"} {
		if v, ok := m[k]; ok {
			fmt.Fprintf(b, "- **%s**: %s\n", strings.Title(k), str(v))
		}
	}
}

func renderClarify(b *strings.Builder, m map[string]any) {
	b.WriteString("# Clarification\n\n## Requirement\n\n")
	for _, seg := range asSlice(m["requirement"]) {
		s := asMap(seg)
		t := str(s["t"])
		if amb, ok := s["amb"]; ok {
			fmt.Fprintf(b, "[%s](#%s)", t, str(amb))
		} else {
			b.WriteString(t)
		}
	}
	b.WriteString("\n\n## Questions\n\n")
	for _, q := range asSlice(m["questions"]) {
		qm := asMap(q)
		fmt.Fprintf(b, "### %s · %s (%s)\n\n%s\n\n", str(qm["n"]), str(qm["topic"]), str(qm["kind"]), str(qm["text"]))
		opts := asSlice(qm["options"])
		ans := qm["answer"]
		for i, o := range opts {
			mark := " "
			switch a := ans.(type) {
			case float64:
				if int(a) == i {
					mark = "x"
				}
			case []any:
				for _, x := range a {
					if xf, ok := x.(float64); ok && int(xf) == i {
						mark = "x"
					}
				}
			}
			fmt.Fprintf(b, "- [%s] %s\n", mark, str(o))
		}
		if s, ok := ans.(string); ok && s != "" {
			fmt.Fprintf(b, "- answer: %s\n", s)
		}
		b.WriteString("\n")
	}
	notes := asSlice(m["notes"])
	if len(notes) > 0 {
		b.WriteString("## Notes\n\n")
		for _, n := range notes {
			nm := asMap(n)
			fmt.Fprintf(b, "- **%s**: %s\n", str(nm["kind"]), str(nm["text"]))
		}
	}
}

func renderStories(b *strings.Builder, m map[string]any) {
	b.WriteString("# Stories\n\n")
	if intent := str(m["intent"]); intent != "" {
		fmt.Fprintf(b, "> %s\n\n", intent)
	}
	epics := asSlice(m["epics"])
	titleOf := map[string]string{}
	if len(epics) > 0 {
		b.WriteString("## Epics\n\n")
		for _, e := range epics {
			em := asMap(e)
			titleOf[str(em["id"])] = str(em["title"])
			fmt.Fprintf(b, "- `%s` — %s\n", str(em["id"]), str(em["title"]))
		}
		b.WriteString("\n")
	}
	cols := asSlice(m["columns"])
	b.WriteString("## Board\n\n")
	for ci, col := range cols {
		fmt.Fprintf(b, "### %s\n\n", str(col))
		for _, c := range asSlice(m["cards"]) {
			cm := asMap(c)
			if int(num(cm["col"])) != ci {
				continue
			}
			flag := ""
			if asBool(cm["flagged"]) {
				flag = " ⚑"
			}
			fmt.Fprintf(b, "- **%s** (%s · %s pts)%s\n", str(cm["title"]), titleOf[str(cm["epic"])], trimNum(num(cm["points"])), flag)
			for _, cr := range asSlice(cm["criteria"]) {
				oneLine := strings.ReplaceAll(str(cr), "\n", " / ")
				fmt.Fprintf(b, "  - %s\n", oneLine)
			}
		}
		b.WriteString("\n")
	}
}

func renderArch(b *strings.Builder, m map[string]any) {
	b.WriteString("# Architecture\n\n## Nodes\n\n")
	for _, n := range asSlice(m["nodes"]) {
		nm := asMap(n)
		fmt.Fprintf(b, "- `%s` (%s) — %s @ (%s,%s)\n", str(nm["id"]), str(nm["type"]), str(nm["label"]), trimNum(num(nm["x"])), trimNum(num(nm["y"])))
		for _, f := range asSlice(nm["fields"]) {
			pair := asSlice(f)
			if len(pair) == 2 {
				fmt.Fprintf(b, "  - %s: %s\n", str(pair[0]), str(pair[1]))
			}
		}
	}
	b.WriteString("\n## Edges\n\n")
	for _, e := range asSlice(m["edges"]) {
		em := asMap(e)
		fmt.Fprintf(b, "- %s → %s\n", str(em["from"]), str(em["to"]))
	}
}

func renderInfra(b *strings.Builder, m map[string]any) {
	b.WriteString("# Infrastructure\n\n## Regions\n\n")
	for _, r := range asSlice(m["regions"]) {
		rm := asMap(r)
		state := "off"
		if asBool(rm["on"]) {
			state = "on"
		}
		fmt.Fprintf(b, "- %s (%s)\n", str(rm["label"]), state)
	}
	b.WriteString("\n## Resources\n\n")
	for _, r := range asSlice(m["resources"]) {
		rm := asMap(r)
		fmt.Fprintf(b, "- `%s` (%s) — %s\n", str(rm["id"]), str(rm["type"]), str(rm["label"]))
	}
}

func renderTests(b *strings.Builder, m map[string]any) {
	b.WriteString("# Tests\n\n")
	types := asSlice(m["types"])
	b.WriteString("| Component |")
	for _, t := range types {
		fmt.Fprintf(b, " %s |", str(t))
	}
	b.WriteString("\n|---|")
	for range types {
		b.WriteString("---|")
	}
	b.WriteString("\n")
	cells := asMap(m["cells"])
	for _, c := range asSlice(m["components"]) {
		cm := asMap(c)
		id := str(cm["id"])
		fmt.Fprintf(b, "| %s |", str(cm["name"]))
		for ti := range types {
			cell := asMap(cells[fmt.Sprintf("%s-%d", id, ti)])
			st := str(cell["status"])
			if st == "" {
				st = "none"
			}
			fmt.Fprintf(b, " %s |", st)
		}
		b.WriteString("\n")
	}
}

func renderSteering(b *strings.Builder, m map[string]any) {
	b.WriteString("# Steering\n\n")
	for _, g := range asSlice(m["groups"]) {
		gm := asMap(g)
		fmt.Fprintf(b, "## %s\n\n", str(gm["title"]))
		for _, r := range asSlice(gm["rules"]) {
			rm := asMap(r)
			mark := " "
			if asBool(rm["on"]) {
				mark = "x"
			}
			if str(rm["kind"]) == "slider" {
				fmt.Fprintf(b, "- [%s] %s (slider: %s)\n", mark, str(rm["label"]), trimNum(num(rm["value"])))
			} else {
				fmt.Fprintf(b, "- [%s] %s\n", mark, str(rm["label"]))
			}
		}
		b.WriteString("\n")
	}
	ex := asSlice(m["exceptions"])
	if len(ex) > 0 {
		b.WriteString("## Exceptions\n\n")
		for _, e := range ex {
			em := asMap(e)
			fmt.Fprintf(b, "- **%s** — `%s` — %s\n", str(em["rule"]), str(em["scope"]), str(em["note"]))
		}
		b.WriteString("\n")
	}
	if s := str(m["sample"]); s != "" {
		b.WriteString("## Sample\n\n```\n" + s + "\n```\n")
	}
}

// ---------------- coercion helpers (parsed JSON => map/[]any/float64/string/bool) ----------------

func asMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}
func asSlice(v any) []any {
	if s, ok := v.([]any); ok {
		return s
	}
	return nil
}
func asBool(v any) bool { b, _ := v.(bool); return b }
func num(v any) float64 { f, _ := v.(float64); return f }
func str(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return trimNum(t)
	case bool:
		return fmt.Sprintf("%t", t)
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", t)
	}
}
func trimNum(f float64) string {
	if f == float64(int64(f)) {
		return fmt.Sprintf("%d", int64(f))
	}
	return fmt.Sprintf("%g", f)
}
