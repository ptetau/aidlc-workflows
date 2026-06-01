package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const sampleState = `# AI-DLC State Tracking

## Project Information
- **Project Name**: Demo
- **Project Type**: Brownfield
- **Current Stage**: Construction - Code Generation

## Project Configuration
- **Documentation Format**: html

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| security-baseline | Yes | Requirements |
| property-based-testing | No | Requirements |

## Stage Progress
- [x] INCEPTION - Requirements Analysis
- [x] INCEPTION - User Stories
- [ ] CONSTRUCTION - NFR Design (SKIP)
- [ ] CONSTRUCTION - Code Generation
`

// set docsDir to a temp <root>/aidlc-docs/workspace and write aidlc-state.md at the aidlc-docs root.
func setupProject(t *testing.T) string {
	t.Helper()
	root := filepath.Join(t.TempDir(), "aidlc-docs")
	docsDir = filepath.Join(root, "workspace")
	if err := os.MkdirAll(docsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "aidlc-state.md"), []byte(sampleState), 0o644); err != nil {
		t.Fatal(err)
	}
	return root
}

func TestParseState(t *testing.T) {
	setupProject(t)
	ps := parseState()
	if !ps.HasState {
		t.Fatal("expected hasState=true")
	}
	if ps.Format != "html" {
		t.Errorf("format = %q, want html", ps.Format)
	}
	if ps.Info["Project Type"] != "Brownfield" {
		t.Errorf("project type = %q", ps.Info["Project Type"])
	}
	if len(ps.Stages) != 4 {
		t.Fatalf("expected 4 stages, got %d", len(ps.Stages))
	}
	byName := map[string]stage{}
	for _, s := range ps.Stages {
		byName[s.Name] = s
	}
	if byName["Requirements Analysis"].Status != "done" {
		t.Errorf("Requirements Analysis status = %q", byName["Requirements Analysis"].Status)
	}
	if byName["Requirements Analysis"].Phase != "INCEPTION" {
		t.Errorf("phase = %q", byName["Requirements Analysis"].Phase)
	}
	if byName["NFR Design"].Status != "skip" {
		t.Errorf("NFR Design should be skip, got %q", byName["NFR Design"].Status)
	}
	if byName["Code Generation"].Status != "pending" {
		t.Errorf("Code Generation should be pending, got %q", byName["Code Generation"].Status)
	}
	// extensions
	if len(ps.Extensions) != 2 {
		t.Fatalf("expected 2 extensions, got %d", len(ps.Extensions))
	}
	exts := map[string]bool{}
	for _, e := range ps.Extensions {
		exts[e.Name] = e.Enabled
	}
	if !exts["security-baseline"] || exts["property-based-testing"] {
		t.Errorf("extension enablement parsed wrong: %v", exts)
	}
}

func TestParseStateMissing(t *testing.T) {
	docsDir = filepath.Join(t.TempDir(), "workspace")
	_ = os.MkdirAll(docsDir, 0o755)
	ps := parseState()
	if ps.HasState {
		t.Error("expected hasState=false when no aidlc-state.md")
	}
}

func TestListDocsExcludesWorkspace(t *testing.T) {
	root := setupProject(t)
	_ = os.MkdirAll(filepath.Join(root, "inception", "requirements"), 0o755)
	_ = os.WriteFile(filepath.Join(root, "inception", "requirements", "requirements.md"), []byte("# Requirements\n"), 0o644)
	_ = os.WriteFile(filepath.Join(root, "audit.md"), []byte("# Audit\n"), 0o644)
	// a markdown file inside workspace/ must be excluded
	_ = os.MkdirAll(filepath.Join(docsDir, "markdown"), 0o755)
	_ = os.WriteFile(filepath.Join(docsDir, "markdown", "stories.md"), []byte("# x\n"), 0o644)

	docs := listDocs()
	paths := map[string]string{}
	for _, d := range docs {
		paths[d.Path] = d.Title
	}
	if _, ok := paths["inception/requirements/requirements.md"]; !ok {
		t.Error("expected requirements.md listed")
	}
	if paths["inception/requirements/requirements.md"] != "Requirements" {
		t.Errorf("title from heading wrong: %q", paths["inception/requirements/requirements.md"])
	}
	if _, ok := paths["aidlc-state.md"]; !ok {
		t.Error("expected aidlc-state.md listed")
	}
	for p := range paths {
		if strings.HasPrefix(p, "workspace/") {
			t.Errorf("workspace doc should be excluded: %s", p)
		}
	}
}

func TestHandleDocRejectsTraversal(t *testing.T) {
	setupProject(t)
	for _, bad := range []string{"../../etc/passwd.md", "../secret.md", "notmd.txt", ""} {
		req := httptest.NewRequest(http.MethodGet, "/api/doc?path="+bad, nil)
		rec := httptest.NewRecorder()
		handleDoc(rec, req)
		if rec.Code == 200 {
			t.Errorf("path %q should be rejected, got 200", bad)
		}
	}
}
