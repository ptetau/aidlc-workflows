package main

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

// normalize round-trips a value through JSON so numbers/types match what parseMarkdown returns.
func normalize(t *testing.T, v any) any {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	var out any
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func roundTrip(t *testing.T, docType string, data any) {
	t.Helper()
	want := normalize(t, data)

	md, err := renderMarkdown(docType, want)
	if err != nil {
		t.Fatalf("renderMarkdown(%s): %v", docType, err)
	}
	gotType, got, err := parseMarkdown(md)
	if err != nil {
		t.Fatalf("parseMarkdown(%s): %v", docType, err)
	}
	if gotType != docType {
		t.Errorf("doc type round-trip: got %q want %q", gotType, docType)
	}
	if !reflect.DeepEqual(want, got) {
		t.Errorf("%s: JSON not preserved through md round-trip\n want %v\n got  %v", docType, want, got)
	}

	// markdown idempotency: re-rendering the parsed data yields identical bytes
	md2, err := renderMarkdown(gotType, got)
	if err != nil {
		t.Fatal(err)
	}
	if md != md2 {
		t.Errorf("%s: markdown not idempotent across a round-trip", docType)
	}

	// the data block must be hidden in rendered markdown (inside an HTML comment)
	if !strings.Contains(md, dataMarker) || !strings.Contains(md, "-->") {
		t.Errorf("%s: missing canonical data block", docType)
	}
}

// Every seeded doc must survive json -> md -> json unchanged.
func TestRoundTripSeedDefaults(t *testing.T) {
	var seed map[string]json.RawMessage
	if err := json.Unmarshal(seedDefaults, &seed); err != nil {
		t.Fatal(err)
	}
	for _, d := range docs {
		raw, ok := seed[d]
		if !ok {
			t.Fatalf("seed missing %s", d)
		}
		var data any
		if err := json.Unmarshal(raw, &data); err != nil {
			t.Fatal(err)
		}
		t.Run(d, func(t *testing.T) { roundTrip(t, d, data) })
	}
}

// Edge cases: empty collections, unicode, multi-line Gherkin, slider rules, text answers.
func TestRoundTripEdgeCases(t *testing.T) {
	cases := map[string]string{
		"clarify": `{"requirement":[{"t":"Plain "},{"amb":"q1","t":"ambiguous — with em·dash"}],
			"questions":[
			  {"id":"q1","n":"Q1","topic":"T","text":"why?","kind":"text","answer":"free text\nwith newline"},
			  {"id":"q2","n":"Q2","topic":"M","text":"pick","kind":"multi","options":["a","b","c"],"answer":[0,2]}],
			"notes":[]}`,
		"stories": `{"intent":"","columns":["A","B"],"epics":[],
			"cards":[{"id":"s1","epic":"","col":1,"points":0,"title":"T",
			  "criteria":["Given x\nWhen y\nThen z"],"flagged":true}]}`,
		"arch":     `{"nodes":[{"id":"n1","type":"api","label":"L","x":80,"y":70,"fields":[]}],"edges":[]}`,
		"infra":    `{"regions":[],"resources":[],"notes":{}}`,
		"tests":    `{"types":["Unit"],"components":[{"id":"c","name":"C"}],"cells":{"c-0":{"status":"none","code":""}}}`,
		"steering": `{"groups":[{"id":"g","title":"G","rules":[{"id":"r","label":"L","on":false,"kind":"slider","value":120,"min":60,"max":140,"step":10}]}],"exceptions":[],"sample":"x = 1"}`,
		"project":  `{"name":"X","repo":"o/x","branch":"main","version":"v2"}`,
	}
	for docType, js := range cases {
		var data any
		if err := json.Unmarshal([]byte(js), &data); err != nil {
			t.Fatalf("%s fixture: %v", docType, err)
		}
		t.Run(docType, func(t *testing.T) { roundTrip(t, docType, data) })
	}
}

func TestParseMarkdownRejectsPlainProse(t *testing.T) {
	_, _, err := parseMarkdown("# Just a heading\n\nSome prose with no data block.\n")
	if err == nil {
		t.Error("expected error for markdown without a data block")
	}
}

func TestExportedMarkdownIsReadable(t *testing.T) {
	// the visible portion (before the comment) should contain real headings, not just JSON
	var seed map[string]json.RawMessage
	_ = json.Unmarshal(seedDefaults, &seed)
	var data any
	_ = json.Unmarshal(seed["stories"], &data)
	md, _ := renderMarkdown("stories", data)
	visible := md[:strings.Index(md, dataMarker)]
	if !strings.Contains(visible, "# Stories") || !strings.Contains(visible, "## Board") {
		t.Error("exported markdown lacks readable headings")
	}
}
