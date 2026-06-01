// project.go — read-only reflection of vanilla aidlc engine state + the full document set.
//
// Canonical markdown stays canonical: these handlers PARSE aidlc-state.md and list/read every
// aidlc-docs/**/*.md. The server never writes engine state — human decisions flow through the
// digest ledger and the agent reconciles them (see PARITY-ROADMAP.md).
package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// aidlcDocsRoot is the aidlc-docs/ dir (parent of the workspace/ dir the server serves).
func aidlcDocsRoot() string { return filepath.Dir(docsDir) }

type stage struct {
	Phase  string `json:"phase"`
	Name   string `json:"name"`
	Status string `json:"status"` // done | skip | pending
}
type extension struct {
	Name      string `json:"name"`
	Enabled   bool   `json:"enabled"`
	DecidedAt string `json:"decidedAt,omitempty"`
}
type projectState struct {
	Project    json.RawMessage `json:"project"`              // project.json (or null)
	Info       map[string]string `json:"info"`               // ## Project Information
	Format     string          `json:"format,omitempty"`     // Documentation Format
	Stages     []stage         `json:"stages"`
	Extensions []extension     `json:"extensions"`
	HasState   bool            `json:"hasState"`             // aidlc-state.md present?
}

var (
	reCheckbox = regexp.MustCompile(`^-\s*\[([ xX])\]\s*(.+)$`)
	reKV       = regexp.MustCompile(`^-\s*\*\*([^*]+)\*\*:\s*(.*)$`)
	reTableRow = regexp.MustCompile(`^\|(.+)\|$`)
)

// parseState reads aidlc-state.md (best-effort, tolerant) into a projectState.
func parseState() projectState {
	ps := projectState{Info: map[string]string{}, Stages: []stage{}, Extensions: []extension{}}
	if raw, err := os.ReadFile(filepath.Join(docsDir, "project.json")); err == nil && json.Valid(raw) {
		ps.Project = raw
	}
	data, err := os.ReadFile(filepath.Join(aidlcDocsRoot(), "aidlc-state.md"))
	if err != nil {
		return ps
	}
	ps.HasState = true
	section := ""
	for _, rawLine := range splitLines(data) {
		line := strings.TrimSpace(string(rawLine))
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "## ") {
			section = strings.ToLower(strings.TrimSpace(line[3:]))
			continue
		}
		switch {
		case strings.Contains(section, "project information"):
			if m := reKV.FindStringSubmatch(line); m != nil {
				ps.Info[strings.TrimSpace(m[1])] = strings.TrimSpace(m[2])
			}
		case strings.Contains(section, "project configuration"):
			if m := reKV.FindStringSubmatch(line); m != nil && strings.EqualFold(strings.TrimSpace(m[1]), "Documentation Format") {
				ps.Format = strings.TrimSpace(m[2])
			}
		case strings.Contains(section, "stage progress"):
			if m := reCheckbox.FindStringSubmatch(line); m != nil {
				ps.Stages = append(ps.Stages, parseStageLine(m[1] != " ", m[2]))
			}
		case strings.Contains(section, "extension configuration"):
			if m := reTableRow.FindStringSubmatch(line); m != nil {
				if ext, ok := parseExtensionRow(m[1]); ok {
					ps.Extensions = append(ps.Extensions, ext)
				}
			}
		}
	}
	return ps
}

func parseStageLine(checked bool, text string) stage {
	st := stage{Status: "pending"}
	if checked {
		st.Status = "done"
	}
	if regexp.MustCompile(`(?i)\bskip`).MatchString(text) {
		st.Status = "skip"
	}
	// "INCEPTION - Requirements Analysis" → phase + name; strip trailing annotations in parens
	body := regexp.MustCompile(`\s*\([^)]*\)\s*$`).ReplaceAllString(text, "")
	if i := strings.Index(body, " - "); i >= 0 {
		st.Phase = strings.TrimSpace(body[:i])
		st.Name = strings.TrimSpace(body[i+3:])
	} else {
		st.Name = strings.TrimSpace(body)
	}
	return st
}

func parseExtensionRow(row string) (extension, bool) {
	cols := strings.Split(row, "|")
	for i := range cols {
		cols[i] = strings.TrimSpace(cols[i])
	}
	if len(cols) < 2 || cols[0] == "" || strings.EqualFold(cols[0], "Extension") || strings.HasPrefix(cols[0], "---") {
		return extension{}, false
	}
	ext := extension{Name: cols[0], Enabled: strings.EqualFold(cols[1], "Yes") || strings.EqualFold(cols[1], "true")}
	if len(cols) >= 3 {
		ext.DecidedAt = cols[2]
	}
	return ext, true
}

func handleProject(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	writeJSON(w, parseState())
}

type docEntry struct {
	Path     string `json:"path"`  // relative to aidlc-docs/
	Title    string `json:"title"`
	Dir      string `json:"dir"` // top-level grouping (e.g. "inception/requirements")
	Editable bool   `json:"editable"`
}

// engine-owned docs the UI must not write (markdown is the agent's execution state for these).
func docEditable(rel string) bool {
	rel = filepath.ToSlash(rel)
	base := rel
	if i := strings.LastIndex(rel, "/"); i >= 0 {
		base = rel[i+1:]
	}
	if base == "aidlc-state.md" || base == "audit.md" {
		return false
	}
	if strings.HasPrefix(rel, "plans/") || strings.Contains(rel, "/plans/") {
		return false
	}
	return true
}

// listDocs walks aidlc-docs/ for *.md, excluding the workspace/ subtree (JSON-canonical there).
func listDocs() []docEntry {
	root := aidlcDocsRoot()
	var out []docEntry
	_ = filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if d.Name() == "workspace" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(strings.ToLower(d.Name()), ".md") {
			return nil
		}
		rel, _ := filepath.Rel(root, p)
		rel = filepath.ToSlash(rel)
		out = append(out, docEntry{Path: rel, Title: docTitle(p, d.Name()), Dir: pathDir(rel), Editable: docEditable(rel)})
		return nil
	})
	return out
}

func pathDir(rel string) string {
	if i := strings.LastIndex(rel, "/"); i >= 0 {
		return rel[:i]
	}
	return "."
}

func docTitle(fullPath, fallback string) string {
	if data, err := os.ReadFile(fullPath); err == nil {
		for _, l := range splitLines(data) {
			s := strings.TrimSpace(string(l))
			if strings.HasPrefix(s, "# ") {
				return strings.TrimSpace(s[2:])
			}
		}
	}
	return strings.TrimSuffix(fallback, ".md")
}

func handleDocs(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	writeJSON(w, listDocs())
}

type eventReq struct {
	Type     string `json:"type"`     // "gate" | "decision"
	Stage    string `json:"stage"`    // the stage/workspace the decision is about
	Decision string `json:"decision"` // "approve" | "changes" | free text
	Note     string `json:"note"`
}

// handleEvent records a human decision (e.g. a gate approval) as a `user` ledger entry that
// /aidlc ingest consumes. The server never drives the workflow — the agent does.
func handleEvent(w http.ResponseWriter, r *http.Request) {
	var req eventReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "bad request: %v", err)
		return
	}
	typ := req.Type
	if typ == "" {
		typ = "decision"
	}
	summary := "Gate · " + req.Decision
	if req.Stage != "" {
		summary += " — " + req.Stage
	}
	if req.Note != "" {
		summary += ": " + req.Note
	}
	mu.Lock()
	defer mu.Unlock()
	now := time.Now().UTC()
	entry := digest{
		ID: fmt.Sprintf("%d-%s", now.UnixNano(), typ), Ts: now.Format(time.RFC3339),
		Actor: "user", Type: typ, Workspace: req.Stage, Summary: summary,
	}
	if err := appendDigest(entry); err != nil {
		httpError(w, http.StatusInternalServerError, "append: %v", err)
		return
	}
	writeJSON(w, map[string]any{"ok": true, "digest": entry})
}

type planEntry struct {
	Path  string `json:"path"`
	Title string `json:"title"`
	Done  int    `json:"done"`
	Total int    `json:"total"`
}

// handlePlans reflects the [ ]/[x] checkbox progress of plan-like docs (the markdown execution
// engine). Read-only: the agent flips the boxes in the canonical markdown.
func handlePlans(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	root := aidlcDocsRoot()
	out := []planEntry{}
	for _, d := range listDocs() {
		data, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(d.Path)))
		if err != nil {
			continue
		}
		done, total := 0, 0
		for _, line := range splitLines(data) {
			if m := reCheckbox.FindStringSubmatch(strings.TrimSpace(string(line))); m != nil {
				total++
				if m[1] != " " {
					done++
				}
			}
		}
		if total > 0 {
			out = append(out, planEntry{Path: d.Path, Title: d.Title, Done: done, Total: total})
		}
	}
	writeJSON(w, out)
}

// handleDoc returns the raw markdown of one doc; path is sanitized to stay within aidlc-docs/.
func handleDoc(w http.ResponseWriter, r *http.Request) {
	rel := r.URL.Query().Get("path")
	if rel == "" || !strings.HasSuffix(strings.ToLower(rel), ".md") {
		httpError(w, http.StatusBadRequest, "path must be a .md file")
		return
	}
	root := aidlcDocsRoot()
	clean := filepath.Join(root, filepath.FromSlash(rel))
	// containment check
	if r2, err := filepath.Rel(root, clean); err != nil || strings.HasPrefix(r2, "..") {
		httpError(w, http.StatusBadRequest, "path escapes aidlc-docs")
		return
	}
	if strings.HasPrefix(filepath.ToSlash(strings.TrimPrefix(clean, root)), "/workspace/") {
		httpError(w, http.StatusBadRequest, "workspace docs are served via /api/state")
		return
	}
	mu.Lock()
	defer mu.Unlock()
	data, err := os.ReadFile(clean)
	if err != nil {
		httpError(w, http.StatusNotFound, "not found: %s", rel)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write(data)
}

// resolveDocPath sanitizes a doc path to a real file within aidlc-docs/ (excluding workspace/).
func resolveDocPath(rel string) (string, error) {
	if rel == "" || !strings.HasSuffix(strings.ToLower(rel), ".md") {
		return "", fmt.Errorf("path must be a .md file")
	}
	root := aidlcDocsRoot()
	clean := filepath.Join(root, filepath.FromSlash(rel))
	if r2, err := filepath.Rel(root, clean); err != nil || strings.HasPrefix(r2, "..") {
		return "", fmt.Errorf("path escapes aidlc-docs")
	}
	if strings.HasPrefix(filepath.ToSlash(strings.TrimPrefix(clean, root)), "/workspace/") {
		return "", fmt.Errorf("workspace docs are JSON-canonical")
	}
	return clean, nil
}

// handleDocSave writes an edited markdown artifact (markdown is canonical for these) and records a
// `doc-edit` ledger entry so /aidlc ingest notices it. Engine-owned docs (state/audit/plans) are
// read-only and rejected.
func handleDocSave(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
		Note    string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "bad request: %v", err)
		return
	}
	clean, err := resolveDocPath(req.Path)
	if err != nil {
		httpError(w, http.StatusBadRequest, "%v", err)
		return
	}
	if !docEditable(req.Path) {
		httpError(w, http.StatusBadRequest, "read-only (engine-owned): %s", req.Path)
		return
	}
	mu.Lock()
	defer mu.Unlock()
	if err := atomicWrite(clean, []byte(req.Content)); err != nil {
		httpError(w, http.StatusInternalServerError, "write: %v", err)
		return
	}
	now := time.Now().UTC()
	summary := "Edited " + req.Path
	if req.Note != "" {
		summary += " — " + req.Note
	}
	_ = appendDigest(digest{ID: fmt.Sprintf("%d-docedit", now.UnixNano()), Ts: now.Format(time.RFC3339),
		Actor: "user", Type: "doc-edit", Workspace: req.Path, Summary: summary})
	writeJSON(w, map[string]any{"ok": true})
}
