# Update Mode Commands

Handles `/aidlc update html` and `/aidlc update markdown`.
These are standalone commands — do not load or run the main workflow.

---

## `/aidlc update html`

Switch an existing aidlc project to HTML documentation mode and generate HTML
companions for every artifact that doesn't have one yet.

### Steps

1. **Check the project exists.**
   Read `aidlc-docs/aidlc-state.md`. If it doesn't exist, stop:
   > No aidlc project found in this directory. Run `/aidlc` to start one.

2. **Read current format.**
   Find `Documentation Format` under `## Project Configuration`.

3. **Update aidlc-state.md.**
   Set `Documentation Format: html`. If the `## Project Configuration` section
   is missing, add it directly after `## Project Information`.

4. **Resolve the script path** (first that exists):
   - `aidlc-rules/scripts/md_to_aidlc_html.py`
   - `.aidlc/aidlc-rules/scripts/md_to_aidlc_html.py`
   - `C:/Users/User/.claude/skills/aidlc/scripts/md_to_aidlc_html.py`

5. **Run the batch converter** on every `.md` file under `aidlc-docs/`,
   skipping `audit.md` and `aidlc-state.md`:

   ```bash
   # Unix / macOS / Git Bash
   find aidlc-docs -name '*.md' \
     ! -name 'audit.md' ! -name 'aidlc-state.md' \
     -exec python <script-path>/md_to_aidlc_html.py {} \;
   ```

   ```powershell
   # Windows PowerShell
   Get-ChildItem aidlc-docs -Recurse -Filter '*.md' |
     Where-Object { $_.Name -notin @('audit.md','aidlc-state.md') } |
     ForEach-Object { python <script-path>/md_to_aidlc_html.py $_.FullName }
   ```

   Use the Bash tool (or PowerShell on Windows) to run this. Detect the OS from
   the workspace root path (backslashes → Windows).

6. **Report.** List each `.html` file written with its `file://` URL:

   ```
   ✅ HTML mode enabled. Generated N companion files:

   🌐 file:///…/aidlc-docs/inception/requirements/requirements.html
   🌐 file:///…/aidlc-docs/inception/application-design/application-design.html
   …

   Open any file in your browser to review and edit inline.
   Changes can be copied as JSON and pasted back to apply.
   ```

   If the project was already in HTML mode, say so and re-generate anyway
   (catches any artifacts added since the last run).

7. **Append to audit.md:**
   ```
   [ISO timestamp] /aidlc update html — Documentation Format set to html.
   N HTML companions generated.
   ```

---

## `/aidlc update markdown`

Switch an existing aidlc project to markdown-only mode. Existing `.html` files
are left on disk but will no longer be regenerated going forward.

### Steps

1. **Check the project exists.**
   Read `aidlc-docs/aidlc-state.md`. If missing, stop with the same error as above.

2. **Update aidlc-state.md.**
   Set `Documentation Format: markdown`.

3. **Offer to remove existing HTML files** (do not delete without asking):

   ```
   ✅ Markdown mode enabled — HTML companions will no longer be generated.

   N existing .html files remain on disk. Remove them?
   Reply Y to delete, N to leave them.
   ```

   Wait for the reply. If Y, delete all `.html` files under `aidlc-docs/`
   (skip `audit.html` and `aidlc-state.html` if they exist — shouldn't, but
   be safe). If N, leave them.

4. **Append to audit.md:**
   ```
   [ISO timestamp] /aidlc update markdown — Documentation Format set to markdown.
   [HTML files deleted / HTML files left on disk.]
   ```
