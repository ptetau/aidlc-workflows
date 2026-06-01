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
	if fr := asSlice(m["functional"]); len(fr) > 0 {
		b.WriteString("\n## Functional requirements\n\n")
		for _, f := range fr {
			fm := asMap(f)
			fmt.Fprintf(b, "- **%s** — %s\n", str(fm["id"]), str(fm["text"]))
		}
	}
	if nf := asSlice(m["nfrs"]); len(nf) > 0 {
		b.WriteString("\n## Non-functional requirements\n\n| Category | Requirement | Target |\n|---|---|---|\n")
		for _, n := range nf {
			nm := asMap(n)
			fmt.Fprintf(b, "| %s | %s | %s |\n", str(nm["category"]), str(nm["requirement"]), str(nm["target"]))
		}
	}
	if dec := asSlice(m["decisions"]); len(dec) > 0 {
		b.WriteString("\n## Architectural decisions\n\n")
		for _, d := range dec {
			dm := asMap(d)
			fmt.Fprintf(b, "- **%s**: %s — %s\n", str(dm["decision"]), str(dm["choice"]), str(dm["rationale"]))
		}
	}
	if sc := asMap(m["scope"]); len(sc) > 0 {
		b.WriteString("\n## MVP scope\n\n")
		for _, kv := range [][2]string{{"in", "In scope"}, {"out", "Out of scope"}} {
			items := asSlice(sc[kv[0]])
			if len(items) == 0 {
				continue
			}
			fmt.Fprintf(b, "**%s:**\n", kv[1])
			for _, it := range items {
				fmt.Fprintf(b, "- %s\n", str(it))
			}
		}
	}
}

func renderStories(b *strings.Builder, m map[string]any) {
	b.WriteString("# Backlog\n\n")
	if intent := str(m["intent"]); intent != "" {
		fmt.Fprintf(b, "> %s\n\n", intent)
	}
	if ps := asSlice(m["personas"]); len(ps) > 0 {
		b.WriteString("## Personas\n\n")
		for _, p := range ps {
			pm := asMap(p)
			fmt.Fprintf(b, "- **%s** (%s)", str(pm["name"]), str(pm["role"]))
			if g := str(pm["goals"]); g != "" {
				fmt.Fprintf(b, " — goals: %s", g)
			}
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}
	// group stories under their epic; agents execute most, humans mark the few + specify criteria
	for _, e := range asSlice(m["epics"]) {
		em := asMap(e)
		eid := str(em["id"])
		fmt.Fprintf(b, "## %s\n\n", str(em["title"]))
		for _, c := range asSlice(m["cards"]) {
			cm := asMap(c)
			if str(cm["epic"]) != eid {
				continue
			}
			tags := []string{}
			if asBool(cm["human"]) {
				tags = append(tags, "human")
			} else {
				tags = append(tags, "agent")
			}
			if asBool(cm["done"]) {
				tags = append(tags, "done")
			}
			if pr := str(cm["priority"]); pr != "" {
				tags = append(tags, pr)
			}
			code := str(cm["code"])
			if code != "" {
				code = code + " · "
			}
			fmt.Fprintf(b, "- **%s%s** _(%s)_\n", code, str(cm["title"]), strings.Join(tags, ", "))
			if as := str(cm["asA"]); as != "" {
				fmt.Fprintf(b, "  - _As a %s, I want %s, so that %s_\n", as, str(cm["iWant"]), str(cm["soThat"]))
			}
			if roles := asSlice(cm["roles"]); len(roles) > 0 {
				rs := make([]string, len(roles))
				for i, r := range roles {
					rs[i] = str(r)
				}
				fmt.Fprintf(b, "  - roles: %s\n", strings.Join(rs, ", "))
			}
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
		for _, mth := range asSlice(nm["methods"]) {
			mm := asMap(mth)
			fmt.Fprintf(b, "  - `%s(%s) → %s` — %s\n", str(mm["name"]), str(mm["input"]), str(mm["output"]), str(mm["purpose"]))
		}
	}
	b.WriteString("\n## Edges\n\n")
	for _, e := range asSlice(m["edges"]) {
		em := asMap(e)
		fmt.Fprintf(b, "- %s → %s\n", str(em["from"]), str(em["to"]))
	}
	if us := asSlice(m["units"]); len(us) > 0 {
		b.WriteString("\n## Units of work (build order)\n\n")
		for _, u := range us {
			um := asMap(u)
			fmt.Fprintf(b, "### #%s %s\n\n", trimNum(num(um["buildOrder"])), str(um["name"]))
			if r := str(um["responsibilities"]); r != "" {
				fmt.Fprintf(b, "%s\n\n", r)
			}
			fmt.Fprintf(b, "- workload: %s · data store: %s · port: %s\n", str(um["workload"]), str(um["datastore"]), str(um["port"]))
			fmt.Fprintf(b, "- components: %s\n", joinAny(asSlice(um["components"])))
			fmt.Fprintf(b, "- stories: %s\n\n", joinAny(asSlice(um["stories"])))
		}
	}
}

func joinAny(items []any) string {
	parts := make([]string, len(items))
	for i, it := range items {
		parts[i] = str(it)
	}
	return strings.Join(parts, ", ")
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
	if sm := asMap(m["summary"]); len(sm) > 0 {
		b.WriteString("\n## Build & test summary\n\n")
		if builds := asSlice(sm["builds"]); len(builds) > 0 {
			b.WriteString("| Component | Build | Coverage |\n|---|---|---|\n")
			for _, bd := range builds {
				bm := asMap(bd)
				fmt.Fprintf(b, "| %s | %s | %s%% |\n", str(bm["component"]), str(bm["build"]), trimNum(num(bm["coverage"])))
			}
		}
		if brs := asSlice(sm["businessRulesVerified"]); len(brs) > 0 {
			b.WriteString("\n**Business rules verified:**\n")
			for _, br := range brs {
				fmt.Fprintf(b, "- %s\n", str(br))
			}
		}
		ready := "No"
		if asBool(sm["readyForOperations"]) {
			ready = "Yes"
		}
		fmt.Fprintf(b, "\n**Ready for Operations:** %s\n", ready)
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
	if ag := asMap(m["agents"]); len(ag) > 0 {
		b.WriteString("\n## AGENTS.md\n\n")
		for _, kv := range [][2]string{{"overview", "Project overview"}, {"techStack", "Tech stack"},
			{"repoStructure", "Repository structure"}, {"buildAndRun", "Build & run"},
			{"conventions", "Key conventions"}, {"architectureDecisions", "Architecture decisions"}} {
			if v := str(ag[kv[0]]); v != "" {
				fmt.Fprintf(b, "### %s\n\n%s\n\n", kv[1], v)
			}
		}
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
