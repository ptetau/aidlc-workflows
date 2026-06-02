package main

import (
	"bytes"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// each test points the package-global docsDir at a fresh temp dir, then seeds it.
// tests must not run in parallel (they share docsDir + mu).
func setup(t *testing.T) string {
	t.Helper()
	docsDir = filepath.Join(t.TempDir(), "workspace")
	if err := seedWorkspace(seedDefaults); err != nil {
		t.Fatalf("seedWorkspace: %v", err)
	}
	return docsDir
}

func readJSON(t *testing.T, path string) map[string]any {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("unmarshal %s: %v", path, err)
	}
	return m
}

func TestSeedWorkspace(t *testing.T) {
	dir := setup(t)
	for _, d := range docs {
		if _, err := os.Stat(filepath.Join(dir, d+".json")); err != nil {
			t.Errorf("expected seeded %s.json: %v", d, err)
		}
		if _, err := os.Stat(filepath.Join(dir, ".snapshot", d+".json")); err != nil {
			t.Errorf("expected seeded baseline .snapshot/%s.json: %v", d, err)
		}
	}
	// content sanity: clarify should have questions, project a name
	clarify := readJSON(t, filepath.Join(dir, "clarify.json"))
	if _, ok := clarify["questions"]; !ok {
		t.Error("seeded clarify.json missing questions")
	}
	proj := readJSON(t, filepath.Join(dir, "project.json"))
	if proj["name"] == nil || proj["name"] == "" {
		t.Error("seeded project.json missing name")
	}
}

func TestSeedDoesNotOverwriteExisting(t *testing.T) {
	dir := setup(t)
	custom := []byte(`{"name":"my-real-project"}` + "\n")
	if err := os.WriteFile(filepath.Join(dir, "project.json"), custom, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := seedWorkspace(seedDefaults); err != nil { // second seed must be a no-op for existing files
		t.Fatal(err)
	}
	proj := readJSON(t, filepath.Join(dir, "project.json"))
	if proj["name"] != "my-real-project" {
		t.Errorf("seed overwrote an existing doc: got %v", proj["name"])
	}
}

func TestStateEndpoint(t *testing.T) {
	setup(t)
	rec := httptest.NewRecorder()
	handleState(rec, httptest.NewRequest(http.MethodGet, "/api/state", nil))
	if rec.Code != 200 {
		t.Fatalf("status = %d, body=%s", rec.Code, rec.Body.String())
	}
	var state map[string]json.RawMessage
	if err := json.Unmarshal(rec.Body.Bytes(), &state); err != nil {
		t.Fatalf("response not JSON: %v", err)
	}
	for _, d := range docs {
		if _, ok := state[d]; !ok {
			t.Errorf("state missing key %q", d)
		}
	}
}

// helper to POST a save and return the recorder
func postSave(t *testing.T, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/save", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	handleSave(rec, req)
	return rec
}

func TestSaveWritesAndRecordsDigest(t *testing.T) {
	dir := setup(t)
	// modify clarify: change notes to a single new note
	doc := json.RawMessage(`{"requirement":[],"questions":[],"notes":[{"id":"x","kind":"NOTE","text":"hi"}]}`)
	rec := postSave(t, map[string]any{"workspace": "clarify", "document": doc})
	if rec.Code != 200 {
		t.Fatalf("save status = %d body=%s", rec.Code, rec.Body.String())
	}
	// on-disk reflects it
	got := readJSON(t, filepath.Join(dir, "clarify.json"))
	notes, ok := got["notes"].([]any)
	if !ok || len(notes) != 1 {
		t.Fatalf("clarify.json notes not persisted: %v", got["notes"])
	}
	// pretty-printed (multi-line) for clean diffs
	raw, _ := os.ReadFile(filepath.Join(dir, "clarify.json"))
	if !bytes.Contains(raw, []byte("\n  ")) {
		t.Error("expected indented JSON on disk")
	}
	// a user digest entry was appended
	entries, err := readDigests()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 digest entry, got %d", len(entries))
	}
	e := entries[0]
	if e.Actor != "user" || e.Workspace != "clarify" {
		t.Errorf("unexpected digest: %+v", e)
	}
	if len(e.Changes) == 0 {
		t.Error("expected at least one field change in digest")
	}
}

func TestSaveNoteBecomesSummary(t *testing.T) {
	setup(t)
	doc := json.RawMessage(`{"a":1}`)
	postSave(t, map[string]any{"workspace": "steering", "document": doc, "note": "my custom note"})
	entries, _ := readDigests()
	if len(entries) == 0 || entries[len(entries)-1].Summary != "my custom note" {
		t.Errorf("note should become the summary, got %q", entries[len(entries)-1].Summary)
	}
}

func TestSaveRejectsUnknownWorkspace(t *testing.T) {
	setup(t)
	rec := postSave(t, map[string]any{"workspace": "bogus", "document": json.RawMessage(`{}`)})
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for unknown workspace, got %d", rec.Code)
	}
}

func TestSaveRejectsMalformedBody(t *testing.T) {
	setup(t)
	req := httptest.NewRequest(http.MethodPost, "/api/save", strings.NewReader("{not json"))
	rec := httptest.NewRecorder()
	handleSave(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for malformed body, got %d", rec.Code)
	}
}

func TestDigestsEndpoint(t *testing.T) {
	setup(t)
	postSave(t, map[string]any{"workspace": "tests", "document": json.RawMessage(`{"x":1}`)})
	postSave(t, map[string]any{"workspace": "infra", "document": json.RawMessage(`{"y":2}`)})
	rec := httptest.NewRecorder()
	handleDigests(rec, httptest.NewRequest(http.MethodGet, "/api/digests", nil))
	if rec.Code != 200 {
		t.Fatalf("status %d", rec.Code)
	}
	var entries []digest
	if err := json.Unmarshal(rec.Body.Bytes(), &entries); err != nil {
		t.Fatalf("not an array: %v", err)
	}
	if len(entries) != 2 {
		t.Errorf("expected 2 entries, got %d", len(entries))
	}
}

func TestDiffDocs(t *testing.T) {
	old := []byte(`{"a":1,"b":[1,2],"c":"keep"}`)
	cur := []byte(`{"a":2,"b":[1,2,3],"c":"keep","d":"new"}`)
	changes := diffDocs(old, cur)
	got := map[string]change{}
	for _, c := range changes {
		got[c.Field] = c
	}
	if _, ok := got["c"]; ok {
		t.Error("unchanged field c should not appear")
	}
	for _, f := range []string{"a", "b", "d"} {
		if _, ok := got[f]; !ok {
			t.Errorf("expected change for %q", f)
		}
	}
	if got["d"].Before != "" {
		t.Errorf("added field should have empty Before, got %q", got["d"].Before)
	}
}

func TestCompactVal(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{[]any{1, 2, 3}, "[3 items]"},
		{map[string]any{"a": 1, "b": 2}, "{2 fields}"},
		{float64(42), "42"},
		{float64(1.5), "1.5"},
		{nil, "null"},
		{"short", "short"},
	}
	for _, c := range cases {
		if got := compactVal(c.in); got != c.want {
			t.Errorf("compactVal(%v) = %q, want %q", c.in, got, c.want)
		}
	}
	long := strings.Repeat("x", 200)
	got := compactVal(long)
	if r := []rune(got); len(r) > 80 || !strings.HasSuffix(got, "…") {
		t.Errorf("long string not truncated to <=80 runes ending in ellipsis: %d runes", len([]rune(got)))
	}
}

func TestAtomicWriteOverwriteNoLeftover(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "f.json")
	if err := atomicWrite(p, []byte("one")); err != nil {
		t.Fatal(err)
	}
	if err := atomicWrite(p, []byte("two")); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(p)
	if string(b) != "two" {
		t.Errorf("content = %q, want two", b)
	}
	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if strings.Contains(e.Name(), ".tmp") {
			t.Errorf("leftover temp file: %s", e.Name())
		}
	}
}

func TestReadDigestsSkipsMalformedLines(t *testing.T) {
	dir := setup(t)
	good := `{"id":"1","ts":"t","actor":"user","summary":"ok"}`
	content := good + "\n{ this is broken\n" + good + "\n"
	if err := os.WriteFile(filepath.Join(dir, "digests.ndjson"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	entries, err := readDigests()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 2 {
		t.Errorf("expected 2 valid entries (malformed skipped), got %d", len(entries))
	}
}

func TestListenPerProjectPort(t *testing.T) {
	port := func(key string) int {
		l := listen(0, key)
		p := l.Addr().(*net.TCPAddr).Port
		l.Close()
		return p
	}
	p1 := port("/projects/alpha")
	if p1 < 7400 || p1 >= 8050 {
		t.Errorf("auto port %d outside expected range", p1)
	}
	// same project path → same port (deterministic), once the prior listener is freed
	if p2 := port("/projects/alpha"); p1 != p2 {
		t.Errorf("same project should map to the same port: %d vs %d", p1, p2)
	}
	// an explicit port is honored
	l := listen(0, "/projects/beta")
	want := l.Addr().(*net.TCPAddr).Port
	l.Close()
	l2 := listen(want, "ignored-key")
	if got := l2.Addr().(*net.TCPAddr).Port; got != want {
		t.Errorf("explicit port not honored: got %d want %d", got, want)
	}
	l2.Close()
}

func TestEmptyDefaultsHaveNoExampleContent(t *testing.T) {
	// the production first-run seed must not leak demo content into real projects
	for _, bad := range []string{"billing", "invoice", "Priya", "LinkVault", "usage"} {
		if strings.Contains(strings.ToLower(string(emptyDefaults)), strings.ToLower(bad)) {
			t.Errorf("empty-defaults.json leaks demo content: %q", bad)
		}
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(emptyDefaults, &m); err != nil {
		t.Fatal(err)
	}
	for _, d := range docs {
		if _, ok := m[d]; !ok {
			t.Errorf("empty defaults missing doc %q", d)
		}
	}
	// seeding empty → blank clarify + a project name derived from the folder
	docsDir = filepath.Join(t.TempDir(), "my-proj", "aidlc-docs", "workspace")
	if err := os.MkdirAll(docsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := seedWorkspace(emptyDefaults); err != nil {
		t.Fatal(err)
	}
	clarify := readJSON(t, filepath.Join(docsDir, "clarify.json"))
	if qs, _ := clarify["questions"].([]any); len(qs) != 0 {
		t.Errorf("empty-seeded clarify should have no questions, got %d", len(qs))
	}
	proj := readJSON(t, filepath.Join(docsDir, "project.json"))
	if proj["name"] != "my-proj" {
		t.Errorf("empty-seeded project name should be the folder 'my-proj', got %v", proj["name"])
	}
}

func TestIsDoc(t *testing.T) {
	for _, d := range docs {
		if !isDoc(d) {
			t.Errorf("isDoc(%q) = false", d)
		}
	}
	if isDoc("nope") {
		t.Error("isDoc(nope) = true")
	}
}
