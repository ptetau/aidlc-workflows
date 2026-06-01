// aidlc-server — serves the AI-DLC Workspace UI and a JSON state API.
//
// State lives as JSON on disk under <docs>/ (default: ./aidlc-docs/workspace):
//   project.json clarify.json stories.json arch.json infra.json tests.json steering.json
//   digests.ndjson      — append-only change-conversation ledger (user + agent entries)
//   .snapshot/<doc>.json — last-ingested baseline, owned by `/aidlc ingest`
//
// Endpoints:
//   GET  /api/state    → combined { project, clarify, ... } object (the browser's window.SEED)
//   POST /api/save     → write one doc atomically + append a `user` digest entry of the diff
//   GET  /api/digests  → the parsed digest ledger (UI polls this to show agent next-steps)
//   GET  /             → embedded UI assets
package main

import (
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"hash/fnv"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"runtime"
	"sort"
	"sync"
	"time"
)

//go:embed all:assets
var assetsFS embed.FS

//go:embed seed-defaults.json
var seedDefaults []byte

// the documents that make up the workspace state, in display order
var docs = []string{"project", "clarify", "stories", "arch", "entities", "rules", "infra", "tests", "steering"}

func isDoc(name string) bool {
	for _, d := range docs {
		if d == name {
			return true
		}
	}
	return false
}

var (
	docsDir string
	mu      sync.Mutex // guards all reads/writes of state + ledger
)

func main() {
	// converter subcommands (run and exit, before server flag parsing)
	if len(os.Args) > 1 && (os.Args[1] == "export" || os.Args[1] == "import") {
		if err := runConvert(os.Args[1], os.Args[2:]); err != nil {
			log.Fatal(err)
		}
		return
	}

	port := flag.Int("port", 0, "port to listen on (0 = auto: a stable per-project port, localhost only)")
	docsFlag := flag.String("docs", "", "path to aidlc-docs/workspace (default: ./aidlc-docs/workspace)")
	noOpen := flag.Bool("no-open", false, "do not auto-open the browser")
	flag.Parse()

	// Windows registry can mis-type these — set them explicitly.
	_ = mime.AddExtensionType(".js", "text/javascript")
	_ = mime.AddExtensionType(".css", "text/css")
	_ = mime.AddExtensionType(".woff2", "font/woff2")

	if *docsFlag != "" {
		docsDir = *docsFlag
	} else {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("cannot determine working directory: %v", err)
		}
		docsDir = filepath.Join(cwd, "aidlc-docs", "workspace")
	}
	if err := seedWorkspace(); err != nil {
		log.Fatalf("seeding workspace: %v", err)
	}

	sub, err := fs.Sub(assetsFS, "assets")
	if err != nil {
		log.Fatalf("embed: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/state", handleState)
	mux.HandleFunc("POST /api/save", handleSave)
	mux.HandleFunc("GET /api/digests", handleDigests)
	mux.HandleFunc("GET /api/project", handleProject) // read-only engine state (parsed aidlc-state.md)
	mux.HandleFunc("GET /api/docs", handleDocs)        // all aidlc-docs/**/*.md outside workspace/
	mux.HandleFunc("GET /api/doc", handleDoc)          // raw markdown of one doc
	mux.Handle("/", http.FileServer(http.FS(sub)))

	// Bind a port now (keeping the listener avoids a race). port 0 → a stable per-project
	// port derived from the docs path, so each aidlc project gets its own and concurrent
	// projects don't collide; if that port is busy we scan upward for a free one.
	ln := listen(*port, docsDir)
	chosen := ln.Addr().(*net.TCPAddr).Port
	url := fmt.Sprintf("http://localhost:%d", chosen)
	log.Printf("aidlc-server · docs=%s", docsDir)
	log.Printf("listening on %s", url)
	if !*noOpen {
		go openBrowser(url)
	}
	if err := http.Serve(ln, mux); err != nil {
		log.Fatal(err)
	}
}

// listen binds a TCP listener. requested==0 → a stable port in [7400,7999] hashed from the
// project key, then the first free port at/above it (scanning a small window).
func listen(requested int, key string) net.Listener {
	base := requested
	if base == 0 {
		h := fnv.New32a()
		_, _ = h.Write([]byte(key))
		base = 7400 + int(h.Sum32()%600)
	}
	for p := base; p < base+50; p++ {
		if l, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", p)); err == nil {
			return l
		}
	}
	log.Fatalf("no free port found near %d", base)
	return nil
}

// ---------------- state seeding ----------------

func seedWorkspace() error {
	if err := os.MkdirAll(filepath.Join(docsDir, ".snapshot"), 0o755); err != nil {
		return err
	}
	var seed map[string]json.RawMessage
	if err := json.Unmarshal(seedDefaults, &seed); err != nil {
		return fmt.Errorf("parse seed-defaults: %w", err)
	}
	for _, d := range docs {
		path := filepath.Join(docsDir, d+".json")
		if _, err := os.Stat(path); errors.Is(err, fs.ErrNotExist) {
			body := indent(seed[d])
			if err := os.WriteFile(path, body, 0o644); err != nil {
				return err
			}
			// seed the ingest baseline too, so the first ingest diffs against the start state
			_ = os.WriteFile(filepath.Join(docsDir, ".snapshot", d+".json"), body, 0o644)
		}
	}
	return nil
}

// ---------------- handlers ----------------

func handleState(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	out := make(map[string]json.RawMessage, len(docs))
	for _, d := range docs {
		raw, err := os.ReadFile(filepath.Join(docsDir, d+".json"))
		if err != nil {
			httpError(w, http.StatusInternalServerError, "reading %s: %v", d, err)
			return
		}
		if !json.Valid(raw) {
			httpError(w, http.StatusInternalServerError, "%s.json is not valid JSON", d)
			return
		}
		out[d] = raw
	}
	writeJSON(w, out)
}

type saveReq struct {
	Workspace string          `json:"workspace"`
	Document  json.RawMessage `json:"document"`
	Note      string          `json:"note"`
}

func handleSave(w http.ResponseWriter, r *http.Request) {
	var req saveReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, http.StatusBadRequest, "bad request body: %v", err)
		return
	}
	if !isDoc(req.Workspace) {
		httpError(w, http.StatusBadRequest, "unknown workspace %q", req.Workspace)
		return
	}
	if !json.Valid(req.Document) {
		httpError(w, http.StatusBadRequest, "document is not valid JSON")
		return
	}

	mu.Lock()
	defer mu.Unlock()

	path := filepath.Join(docsDir, req.Workspace+".json")
	old, _ := os.ReadFile(path) // ignore error: may not exist yet

	body := indent(req.Document)
	if err := atomicWrite(path, body); err != nil {
		httpError(w, http.StatusInternalServerError, "writing %s: %v", req.Workspace, err)
		return
	}

	entry := newUserDigest(req.Workspace, old, body, req.Note)
	if err := appendDigest(entry); err != nil {
		log.Printf("warning: could not append digest: %v", err)
	}
	writeJSON(w, map[string]any{"ok": true, "digest": entry})
}

func handleDigests(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	entries, err := readDigests()
	if err != nil {
		httpError(w, http.StatusInternalServerError, "reading digests: %v", err)
		return
	}
	writeJSON(w, entries)
}

// ---------------- digest ledger ----------------

type change struct {
	Field  string `json:"field"`
	Before string `json:"before,omitempty"`
	After  string `json:"after,omitempty"`
}

type digest struct {
	ID        string   `json:"id"`
	Ts        string   `json:"ts"`
	Actor     string   `json:"actor"` // "user" | "agent"
	Workspace string   `json:"workspace,omitempty"`
	Summary   string   `json:"summary"`
	NextSteps []string `json:"nextSteps,omitempty"`
	Changes   []change `json:"changes,omitempty"`
}

func newUserDigest(ws string, oldBytes, newBytes []byte, note string) digest {
	now := time.Now().UTC()
	changes := diffDocs(oldBytes, newBytes)
	var summary string
	if note != "" {
		summary = note
	} else if len(oldBytes) == 0 {
		summary = fmt.Sprintf("Created %s", ws)
	} else if len(changes) == 0 {
		summary = fmt.Sprintf("Re-saved %s with no field changes", ws)
	} else {
		fields := make([]string, len(changes))
		for i, c := range changes {
			fields[i] = c.Field
		}
		summary = fmt.Sprintf("Edited %s · %d field(s) changed: %s", ws, len(changes), joinMax(fields, 4))
	}
	return digest{
		ID:        fmt.Sprintf("%d-%s", now.UnixNano(), ws),
		Ts:        now.Format(time.RFC3339),
		Actor:     "user",
		Workspace: ws,
		Summary:   summary,
		Changes:   changes,
	}
}

func appendDigest(d digest) error {
	f, err := os.OpenFile(filepath.Join(docsDir, "digests.ndjson"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	line, err := json.Marshal(d)
	if err != nil {
		return err
	}
	_, err = f.Write(append(line, '\n'))
	return err
}

func readDigests() ([]digest, error) {
	raw, err := os.ReadFile(filepath.Join(docsDir, "digests.ndjson"))
	if errors.Is(err, fs.ErrNotExist) {
		return []digest{}, nil
	}
	if err != nil {
		return nil, err
	}
	out := []digest{}
	for _, line := range splitLines(raw) {
		if len(line) == 0 {
			continue
		}
		var d digest
		if err := json.Unmarshal(line, &d); err != nil {
			continue // skip malformed lines rather than failing the whole feed
		}
		out = append(out, d)
	}
	return out, nil
}

// diffDocs compares two JSON documents at the top level and returns per-field changes.
func diffDocs(oldBytes, newBytes []byte) []change {
	var oldM, newM map[string]any
	_ = json.Unmarshal(oldBytes, &oldM)
	_ = json.Unmarshal(newBytes, &newM)
	if oldM == nil {
		oldM = map[string]any{}
	}
	if newM == nil {
		newM = map[string]any{}
	}
	keys := map[string]struct{}{}
	for k := range oldM {
		keys[k] = struct{}{}
	}
	for k := range newM {
		keys[k] = struct{}{}
	}
	sorted := make([]string, 0, len(keys))
	for k := range keys {
		sorted = append(sorted, k)
	}
	sort.Strings(sorted)

	var changes []change
	for _, k := range sorted {
		ov, ook := oldM[k]
		nv, nok := newM[k]
		if ook && nok && reflect.DeepEqual(ov, nv) {
			continue
		}
		c := change{Field: k}
		if ook {
			c.Before = compactVal(ov)
		}
		if nok {
			c.After = compactVal(nv)
		}
		changes = append(changes, c)
	}
	return changes
}

// ---------------- small helpers ----------------

func compactVal(v any) string {
	switch t := v.(type) {
	case []any:
		return fmt.Sprintf("[%d items]", len(t))
	case map[string]any:
		return fmt.Sprintf("{%d fields}", len(t))
	case string:
		return truncate(t, 80)
	case nil:
		return "null"
	case float64:
		// render integers without trailing .0
		if t == float64(int64(t)) {
			return fmt.Sprintf("%d", int64(t))
		}
		return fmt.Sprintf("%v", t)
	default:
		return truncate(fmt.Sprintf("%v", t), 80)
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}

func joinMax(items []string, max int) string {
	if len(items) <= max {
		return joinComma(items)
	}
	return joinComma(items[:max]) + fmt.Sprintf(", +%d more", len(items)-max)
}

func joinComma(items []string) string {
	out := ""
	for i, s := range items {
		if i > 0 {
			out += ", "
		}
		out += s
	}
	return out
}

func splitLines(b []byte) [][]byte {
	var lines [][]byte
	start := 0
	for i, c := range b {
		if c == '\n' {
			lines = append(lines, trimCR(b[start:i]))
			start = i + 1
		}
	}
	if start < len(b) {
		lines = append(lines, trimCR(b[start:]))
	}
	return lines
}

func trimCR(b []byte) []byte {
	if len(b) > 0 && b[len(b)-1] == '\r' {
		return b[:len(b)-1]
	}
	return b
}

func indent(raw json.RawMessage) []byte {
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return raw // fall back to as-is if not parseable (shouldn't happen — validated upstream)
	}
	out, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return raw
	}
	return append(out, '\n')
}

// atomicWrite writes to a temp file in the same directory then renames over the target.
func atomicWrite(path string, data []byte) error {
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, filepath.Base(path)+".*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op if rename succeeded
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func httpError(w http.ResponseWriter, code int, format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	log.Printf("HTTP %d: %s", code, msg)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		log.Printf("could not open browser (open %s manually): %v", url, err)
	}
}
