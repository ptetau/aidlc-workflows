// convert_cli.go — `aidlc-server export|import` subcommands.
//
//	aidlc-server export -docs <ws> [-out <dir>]   # workspace/*.json -> <dir>/<doc>.md (readable + data block)
//	aidlc-server import -md   <dir> -docs <ws>     # <dir>/*.md (with data block) -> workspace/<doc>.json
//
// Round-trips with the canonical data block embedded by export. `import` only reads docs whose
// markdown carries an aidlc data block; free-form prose is out of scope here (use `/aidlc adopt`).
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
)

func runConvert(mode string, args []string) error {
	fs := flag.NewFlagSet(mode, flag.ExitOnError)
	docsFlag := fs.String("docs", "", "workspace dir holding <doc>.json")
	mdFlag := fs.String("md", "", "markdown dir")
	outFlag := fs.String("out", "", "output dir (export: where .md go; default = -md or alongside)")
	_ = fs.Parse(args)

	ws := *docsFlag
	if ws == "" {
		if cwd, err := os.Getwd(); err == nil {
			ws = filepath.Join(cwd, "aidlc-docs", "workspace")
		}
	}

	switch mode {
	case "export":
		outDir := *outFlag
		if outDir == "" {
			outDir = *mdFlag
		}
		if outDir == "" {
			outDir = filepath.Join(ws, "markdown")
		}
		if err := os.MkdirAll(outDir, 0o755); err != nil {
			return err
		}
		n := 0
		for _, d := range docs {
			raw, err := os.ReadFile(filepath.Join(ws, d+".json"))
			if err != nil {
				continue // doc not present — skip
			}
			var data any
			if err := json.Unmarshal(raw, &data); err != nil {
				return fmt.Errorf("%s.json: %w", d, err)
			}
			md, err := renderMarkdown(d, data)
			if err != nil {
				return err
			}
			if err := os.WriteFile(filepath.Join(outDir, d+".md"), []byte(md), 0o644); err != nil {
				return err
			}
			n++
		}
		fmt.Printf("exported %d doc(s) to %s\n", n, outDir)

	case "import":
		mdDir := *mdFlag
		if mdDir == "" {
			mdDir = *outFlag
		}
		if mdDir == "" {
			return fmt.Errorf("import: -md <dir> is required")
		}
		if err := os.MkdirAll(ws, 0o755); err != nil {
			return err
		}
		n := 0
		entries, err := os.ReadDir(mdDir)
		if err != nil {
			return err
		}
		for _, e := range entries {
			if e.IsDir() || filepath.Ext(e.Name()) != ".md" {
				continue
			}
			raw, err := os.ReadFile(filepath.Join(mdDir, e.Name()))
			if err != nil {
				return err
			}
			docType, data, err := parseMarkdown(string(raw))
			if err != nil {
				fmt.Printf("skip %s: %v\n", e.Name(), err)
				continue
			}
			out, err := json.MarshalIndent(data, "", "  ")
			if err != nil {
				return err
			}
			if err := os.WriteFile(filepath.Join(ws, docType+".json"), append(out, '\n'), 0o644); err != nil {
				return err
			}
			n++
		}
		fmt.Printf("imported %d doc(s) to %s\n", n, ws)
	}
	return nil
}
