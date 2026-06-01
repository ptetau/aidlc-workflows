#!/usr/bin/env python3
"""
aidlc-doc-to-html  |  md_to_aidlc_html.py

Convert an aidlc markdown artifact into a squiz-styled editable HTML file.
Each heading-delimited section becomes an auto-sizing textarea.
"copy json" exports only *changed* sections as a diff payload that
Claude Code can apply directly.

Usage:
    python scripts/md_to_aidlc_html.py  path/to/artifact.md
    python scripts/md_to_aidlc_html.py  path/to/artifact.md  --theme paper

Themes: phosphor (default) | paper | amber | beige | rose | ocean | forest | slate
Output: path/to/artifact.html  (written alongside the source .md)
"""

import sys
import re
import json
import html as html_lib
from pathlib import Path


# ── Markdown section parser ───────────────────────────────────────────────────

def parse_sections(text):
    """Split markdown into heading-delimited sections."""
    sections = []
    current = {"heading": None, "level": 0, "lines": []}

    for line in text.splitlines():
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            sections.append(current)
            current = {
                "heading": m.group(2).strip(),
                "level": len(m.group(1)),
                "lines": [],
            }
        else:
            current["lines"].append(line)
    sections.append(current)

    result = []
    for i, s in enumerate(sections):
        body = "\n".join(s["lines"]).strip()
        if i == 0 and not s["heading"] and not body:
            continue  # skip empty leading preamble
        result.append({
            "id": f"s{i}",
            "heading": s["heading"],
            "level": s["level"],
            "body": body,
        })
    return result


# ── HTML helpers ──────────────────────────────────────────────────────────────

def esc(text):
    return html_lib.escape(text or "", quote=True)

def attr_esc(text):
    """Escape for double-quoted HTML attribute (also encodes newlines)."""
    t = html_lib.escape(text or "", quote=True)
    return t.replace("\n", "&#10;").replace("\r", "")


# ── CSS ───────────────────────────────────────────────────────────────────────
# Adapted from squiz styles.css (same theme system, layout, statusbar, modal).
# Squiz card/option styles replaced with .section / .section-body (textarea).

CSS = r"""
/* AIDLC-DOC · Apple //e × IBM Plex  (adapted from squiz) */

/* ── THEMES ────────────────────────────────────────────────────────────── */
:root, :root[data-theme="paper"] {
  --bg:#f1ebde;--bg-2:#e9e2d0;--surface:#faf6ec;
  --ink:#1a1814;--ink-2:#4a463d;--ink-3:#8a847a;
  --rule:#c9bf9f;--rule-2:#b3a785;
  --accent:#b34a1a;--accent-soft:#e9c5b0;
  --highlight:#f3df87;--selected:#fff8e6;
  --scanline-color:rgba(26,24,20,0.06);
  color-scheme:light;
}
:root[data-theme="phosphor"] {
  --bg:#0b0f08;--bg-2:#11170d;--surface:#0e140a;
  --ink:#7df57d;--ink-2:#4fb44f;--ink-3:#2e6f2e;
  --rule:#1f5a1f;--rule-2:#2e7a2e;
  --accent:#c8ff8c;--accent-soft:#2a4d2a;
  --highlight:#1f5a1f;--selected:#14241a;
  --scanline-color:rgba(125,245,125,0.07);
}
:root[data-theme="amber"] {
  --bg:#0e0a04;--bg-2:#1a1306;--surface:#14100a;
  --ink:#ffb84d;--ink-2:#c98a30;--ink-3:#7a5520;
  --rule:#4d3812;--rule-2:#6b4f1d;
  --accent:#ffd8a3;--accent-soft:#3a2a10;
  --highlight:#4d3812;--selected:#2a1f0c;
  --scanline-color:rgba(255,184,77,0.06);
}
:root[data-theme="beige"] {
  --bg:#d4cdbb;--bg-2:#c4bda9;--surface:#e0d9c5;
  --ink:#161616;--ink-2:#393939;--ink-3:#6f6f6f;
  --rule:#8d8676;--rule-2:#6d685b;
  --accent:#0f62fe;--accent-soft:#c6dbff;
  --highlight:#ffe97a;--selected:#eee8d6;
  --scanline-color:rgba(0,0,0,0.04);color-scheme:light;
}
:root[data-theme="rose"] {
  --bg:#faecf0;--bg-2:#f3dde4;--surface:#fff5f8;
  --ink:#2a0e1f;--ink-2:#5c3346;--ink-3:#9b7587;
  --rule:#d9b4c0;--rule-2:#c39ba9;
  --accent:#c93069;--accent-soft:#f5cdd9;
  --highlight:#ffe97a;--selected:#fff0f5;
  --scanline-color:rgba(42,14,31,0.05);color-scheme:light;
}
:root[data-theme="ocean"] {
  --bg:#e8f0f4;--bg-2:#d3e2ea;--surface:#f3f8fb;
  --ink:#07344a;--ink-2:#1f5a73;--ink-3:#5a8ba0;
  --rule:#b8d0db;--rule-2:#9bbac8;
  --accent:#e85a4f;--accent-soft:#f9d3cf;
  --highlight:#ffe97a;--selected:#f0f8fb;
  --scanline-color:rgba(7,52,74,0.05);color-scheme:light;
}
:root[data-theme="forest"] {
  --bg:#f0eadb;--bg-2:#e6dec9;--surface:#f8f3e5;
  --ink:#1f3320;--ink-2:#45533d;--ink-3:#7d8a73;
  --rule:#c2c0a8;--rule-2:#a7a48a;
  --accent:#c89846;--accent-soft:#f0e2c4;
  --highlight:#ffe97a;--selected:#f8f4e0;
  --scanline-color:rgba(31,51,32,0.05);color-scheme:light;
}
:root[data-theme="slate"] {
  --bg:#1a1d22;--bg-2:#25292f;--surface:#1f2329;
  --ink:#e3e6eb;--ink-2:#b4b9c1;--ink-3:#828893;
  --rule:#3a3f47;--rule-2:#4a4f57;
  --accent:#4a90e2;--accent-soft:#2a3a5a;
  --highlight:#ffd84d;--selected:#232831;
  --scanline-color:rgba(227,230,235,0.04);
}

/* ── BASE ───────────────────────────────────────────────────────────────── */
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg)}
html{
  --pad:18px;--gap:14px;--row-gap:40px;
  --max-w:780px;--fs-base:16px;--fs-mono:13px;
  --fs-title:22px;--fs-display:34px;--line:1.6;
}
body{
  color:var(--ink);
  font-family:"IBM Plex Sans",system-ui,sans-serif;
  font-size:var(--fs-base);line-height:var(--line);
  -webkit-font-smoothing:antialiased;
  transition:background .2s,color .2s;
}
html[data-theme="phosphor"] body,
html[data-theme="amber"] body,
html[data-theme="slate"] body{text-shadow:0 0 .5px currentColor}

body::before{
  content:"";position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:0;
  background-image:repeating-linear-gradient(
    to bottom,transparent 0,transparent 2px,
    var(--scanline-color) 2px,var(--scanline-color) 3px);
  mix-blend-mode:multiply;
}
html[data-scanlines="on"] body::before{opacity:1}
html[data-theme="phosphor"][data-scanlines="on"] body::before,
html[data-theme="amber"][data-scanlines="on"] body::before,
html[data-theme="slate"][data-scanlines="on"] body::before{
  mix-blend-mode:screen;opacity:.7;
}

/* ── LAYOUT ─────────────────────────────────────────────────────────────── */
.page{max-width:var(--max-w);margin:0 auto;padding:14px var(--pad) 100px}

/* ── TOPBAR ─────────────────────────────────────────────────────────────── */
.topbar{
  display:flex;align-items:center;justify-content:space-between;
  font-family:"IBM Plex Mono",monospace;font-size:11px;
  color:var(--ink-3);padding:6px 0 8px;margin-bottom:14px;
  border-bottom:1px solid var(--rule);letter-spacing:.02em;
}
.topbar .left{display:flex;align-items:baseline;gap:12px}
.topbar .aidlc{color:var(--ink);font-weight:600;letter-spacing:-.01em}
.topbar .aidlc::after{
  content:"█";color:var(--accent);margin-left:2px;font-size:.85em;
  animation:blink 1.1s steps(2) infinite;
}
@keyframes blink{50%{opacity:0}}

/* ── INTRO ──────────────────────────────────────────────────────────────── */
.intro{margin-bottom:28px}
.intro-title{
  font-family:"IBM Plex Sans",sans-serif;
  font-size:var(--fs-display);font-weight:600;
  line-height:1.1;letter-spacing:-.02em;margin:8px 0 10px;color:var(--ink);
}
.intro-lede{
  font-family:"IBM Plex Mono",monospace;font-size:12px;
  color:var(--ink-2);margin:0;
}
.intro-meta{
  font-family:"IBM Plex Mono",monospace;font-size:11px;
  letter-spacing:.04em;color:var(--ink-3);margin-top:10px;
}
.intro-meta .dot{color:var(--rule-2);margin:0 6px}

/* ── SECTION HEAD ───────────────────────────────────────────────────────── */
.section-head{
  display:flex;align-items:baseline;justify-content:space-between;
  border-bottom:1px solid var(--rule-2);padding-bottom:6px;margin-bottom:28px;
}
.section-head h2{
  font-family:"IBM Plex Sans",sans-serif;font-size:var(--fs-title);
  margin:0;font-weight:600;color:var(--ink);letter-spacing:-.015em;
}
.section-head .count{
  font-family:"IBM Plex Mono",monospace;font-size:11px;
  letter-spacing:.04em;color:var(--ink-3);
}

/* ── SECTION CARD ───────────────────────────────────────────────────────── */
.section{margin-bottom:var(--row-gap);scroll-margin-top:16px}
.section-header{
  display:grid;grid-template-columns:56px 1fr;
  gap:14px;margin-bottom:8px;align-items:start;
}
@media(max-width:640px){
  .section-header{grid-template-columns:1fr;gap:4px}
  .section-body{margin-left:0!important;width:100%!important}
}
.section-num{
  font-family:"IBM Plex Mono",monospace;font-size:12px;
  font-weight:500;color:var(--accent);padding-top:4px;
  letter-spacing:.04em;line-height:1.3;
}
.section-num-suffix{color:var(--ink-3);font-weight:400;font-size:11px}
.section-heading{
  font-family:"IBM Plex Sans",sans-serif;
  font-size:calc(var(--fs-title) - 2px);line-height:1.25;
  margin:0;font-weight:600;color:var(--ink);letter-spacing:-.015em;
}
h3.section-heading{font-size:calc(var(--fs-base) + 1px)}
h4.section-heading,h5.section-heading,h6.section-heading{
  font-size:var(--fs-base);color:var(--ink-2);
}
.preamble-label{
  font-family:"IBM Plex Mono",monospace;font-size:11px;
  letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);
}
.preamble-label::before{content:"// ";color:var(--accent)}

/* ── SECTION BODY (textarea) ────────────────────────────────────────────── */
.section-body{
  display:block;margin-left:70px;width:calc(100% - 70px);
  background:var(--surface);border:1px solid var(--rule);
  padding:10px 14px;overflow:hidden;resize:none;
  font-family:"IBM Plex Mono",monospace;font-size:var(--fs-mono);
  line-height:1.65;color:var(--ink);outline:none;
  min-height:44px;transition:border-color .12s,background .12s;
}
.section-body:focus{border-color:var(--accent)}
.section-body.modified{border-color:var(--accent);background:var(--selected)}

/* ── STATUS BAR ─────────────────────────────────────────────────────────── */
.statusbar{
  position:fixed;bottom:12px;left:50%;transform:translateX(-50%);
  background:var(--ink);color:var(--bg);padding:6px 6px 6px 14px;
  display:flex;align-items:center;gap:14px;
  font-family:"IBM Plex Mono",monospace;font-size:10px;
  text-transform:uppercase;letter-spacing:.12em;
  z-index:50;box-shadow:0 8px 30px -6px rgba(0,0,0,.4);
  max-width:calc(100vw - 24px);
}
.statusbar-info{display:flex;align-items:center;gap:10px}
.statusbar-count{font-size:11px}
.statusbar-divider{width:1px;height:18px;background:rgba(255,255,255,.18)}
.export-btn{
  background:var(--accent);color:var(--bg);border:none;
  padding:6px 12px;font-family:inherit;font-size:10px;
  text-transform:uppercase;letter-spacing:.12em;font-weight:600;
  cursor:pointer;display:flex;align-items:center;gap:6px;
}
.export-btn::before{content:">";font-weight:700}
.export-btn:hover{filter:brightness(1.1)}
.export-btn:disabled{opacity:.35;cursor:not-allowed}
.export-btn.done{
  background:var(--ink);border:1px solid var(--accent);color:var(--accent);
}

/* ── MODAL ──────────────────────────────────────────────────────────────── */
.modal-overlay{
  position:fixed;inset:0;background:rgba(10,8,4,.7);
  display:flex;align-items:center;justify-content:center;
  z-index:100;padding:24px;backdrop-filter:blur(2px);
  animation:fadeIn .18s ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{
  background:var(--bg);max-width:740px;width:100%;
  max-height:85vh;display:flex;flex-direction:column;
  border:1px solid var(--ink);box-shadow:8px 8px 0 var(--accent);
}
.modal-head{
  padding:10px 14px;border-bottom:1px solid var(--rule);
  display:flex;align-items:center;justify-content:space-between;
  font-family:"IBM Plex Mono",monospace;
}
.modal-head h3{font-size:14px;font-weight:600;margin:0}
.modal-head h3::before{content:"// ";color:var(--accent)}
.modal-head .x{
  background:none;border:1px solid var(--rule);
  width:22px;height:22px;font-size:12px;cursor:pointer;
  color:var(--ink-2);font-family:"IBM Plex Mono",monospace;line-height:1;
}
.modal-head .x:hover{color:var(--accent);border-color:var(--accent)}
.modal-body{
  flex:1;overflow:auto;background:#0e0c08;color:#e8e2d2;
}
html[data-theme="phosphor"] .modal-body{background:#050805;color:var(--ink)}
html[data-theme="amber"]    .modal-body{background:#0a0703;color:var(--ink)}
html[data-theme="slate"]    .modal-body{background:#0e1116;color:var(--ink)}
.modal-body pre{
  margin:0;padding:16px 18px;
  font-family:"IBM Plex Mono",monospace;font-size:11.5px;
  line-height:1.6;white-space:pre-wrap;word-break:break-word;
}
.modal-body .k{color:#c9a96e}.modal-body .s{color:#95c89b}
.modal-body .n{color:#d97e6e}.modal-body .b{color:#888073}
html[data-theme="phosphor"] .modal-body .k{color:#c8ff8c}
html[data-theme="phosphor"] .modal-body .s{color:#7df57d}
html[data-theme="phosphor"] .modal-body .n{color:#c8ff8c}
html[data-theme="phosphor"] .modal-body .b{color:#4fb44f}
html[data-theme="amber"]    .modal-body .k{color:#ffd8a3}
html[data-theme="amber"]    .modal-body .s{color:#ffb84d}
html[data-theme="amber"]    .modal-body .n{color:#ffd8a3}
html[data-theme="amber"]    .modal-body .b{color:#c98a30}
html[data-theme="slate"]    .modal-body .k{color:#8ab4f4}
html[data-theme="slate"]    .modal-body .s{color:#a5d6a7}
html[data-theme="slate"]    .modal-body .n{color:#ff9882}
html[data-theme="slate"]    .modal-body .b{color:#b4b9c1}
.modal-foot{
  padding:10px 14px;border-top:1px solid var(--rule);
  display:flex;align-items:center;justify-content:space-between;gap:10px;
}
.modal-foot .hint{
  font-family:"IBM Plex Mono",monospace;font-size:10px;
  letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);
}
.copy-btn{
  background:var(--ink);color:var(--bg);border:none;
  padding:8px 16px;font-family:"IBM Plex Mono",monospace;
  font-size:10px;text-transform:uppercase;letter-spacing:.12em;
  font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;
}
.copy-btn::before{content:"❯";color:var(--accent)}
.copy-btn:hover{filter:brightness(1.15)}
.copy-btn.copied{background:var(--accent)}
.copy-btn.copied::before{content:"✓";color:var(--bg)}

/* ── FOOTER ─────────────────────────────────────────────────────────────── */
.docfoot{
  margin-top:40px;padding-top:10px;border-top:1px solid var(--ink);
  display:flex;justify-content:space-between;align-items:baseline;
  font-family:"IBM Plex Mono",monospace;font-size:10px;
  text-transform:uppercase;letter-spacing:.12em;color:var(--ink-3);
}
.docfoot .left::before{content:"└─ ";color:var(--accent)}

/* ── ACCESSIBILITY ──────────────────────────────────────────────────────── */
.skip-link{
  position:absolute;top:-100px;left:8px;
  background:var(--accent);color:var(--bg);padding:8px 14px;
  font-family:"IBM Plex Mono",monospace;font-size:12px;font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;text-decoration:none;
  z-index:10000;transition:top .15s;
}
.skip-link:focus{top:8px;outline:2px solid var(--ink);outline-offset:2px}
.section-body:focus-visible,.export-btn:focus-visible,
.copy-btn:focus-visible,.modal-head .x:focus-visible{
  outline:2px solid var(--accent);outline-offset:2px;
}
@media(prefers-reduced-motion:reduce){
  .section-body,.export-btn,.copy-btn,.skip-link{transition:none!important}
  .topbar .aidlc::after{animation:none}
}
"""

# ── JavaScript ────────────────────────────────────────────────────────────────
# Placeholders: __FILE_JSON__ and __SECTIONS_JSON__ (replaced before writing).

JS = r"""
(function () {
  var FILE     = __FILE_JSON__;
  var SECTIONS = __SECTIONS_JSON__;
  var state    = {};

  // auto-size all textareas on load
  document.querySelectorAll('.section-body').forEach(function(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  });

  // track edits
  document.querySelectorAll('.section-body').forEach(function(ta) {
    ta.addEventListener('input', function() {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      var id   = ta.dataset.id;
      var orig = ta.dataset.original;  // browser decodes &#10; back to \n
      if (ta.value !== orig) {
        state[id] = ta.value;
        ta.classList.add('modified');
      } else {
        delete state[id];
        ta.classList.remove('modified');
      }
      updateBar();
    });
  });

  // sync both statusbar-count elements (intro + statusbar)
  function updateBar() {
    var n     = Object.keys(state).length;
    var total = SECTIONS.length;
    var text  = pad(n) + ' / ' + pad(total) + ' modified';
    document.querySelectorAll('.statusbar-count').forEach(function(el) {
      el.textContent = text;
    });
    var btn = document.querySelector('.export-btn');
    btn.disabled = (n === 0);
    btn.classList.toggle('done', n > 0);
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  // build diff export
  function buildExport() {
    var changes = [];
    SECTIONS.forEach(function(s) {
      if (!(s.id in state)) return;
      var prefix  = s.level > 0 ? new Array(s.level + 1).join('#') + ' ' : '';
      var heading = prefix + (s.heading || '(preamble)');
      changes.push({
        section:  heading,
        original: s.body,
        current:  state[s.id],
      });
    });
    return {
      file: FILE,
      instructions:
        'Apply each change to the markdown file. ' +
        'For each entry in "changes": locate the section whose heading matches ' +
        '"section" and replace its body text (content after the heading line, ' +
        'up to the next same-or-higher-level heading) with the "current" value. ' +
        'The "original" field is provided for context and verification.',
      changes: changes,
    };
  }

  // syntax highlight JSON
  function hl(json) {
    return json
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?/g,
        function(m, p1, p2) {
          return p2 ? '<span class="k">' + p1 + '</span>' + p2
                    : '<span class="s">' + p1 + '</span>';
        })
      .replace(/\b(true|false|null)\b/g, '<span class="b">$1</span>')
      .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="n">$1</span>');
  }

  // clock
  function tick() {
    var now = new Date();
    var d = now.toLocaleDateString('en-US',
      {year:'numeric', month:'short', day:'2-digit'}).toUpperCase();
    var t = now.toLocaleTimeString('en-US', {hour12: false});
    var el = document.querySelector('.topbar-clock');
    if (el) el.textContent = d + ' · ' + t;
  }
  setInterval(tick, 1000);
  tick();

  // modal
  var modal      = document.querySelector('.modal-overlay');
  var modalPre   = modal.querySelector('pre');
  var exportBtn  = document.querySelector('.export-btn');
  var closeBtn   = modal.querySelector('.x');
  var copyBtn    = modal.querySelector('.copy-btn');
  var backFocus  = null;

  function openModal() {
    if (exportBtn.disabled) return;
    var json = JSON.stringify(buildExport(), null, 2);
    modalPre.innerHTML   = hl(json);
    modalPre.dataset.raw = json;
    backFocus = document.activeElement;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(function() { copyBtn.focus(); }, 0);
  }
  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (backFocus && backFocus.focus) backFocus.focus();
  }

  exportBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (modal.style.display === 'none') return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab') {
      var fs  = [closeBtn, copyBtn];
      var idx = fs.indexOf(document.activeElement);
      if (idx < 0) return;
      e.preventDefault();
      fs[(idx + (e.shiftKey ? -1 : 1) + fs.length) % fs.length].focus();
    }
  });

  copyBtn.addEventListener('click', async function() {
    var raw = modalPre.dataset.raw || '';
    try { await navigator.clipboard.writeText(raw); }
    catch (_) {
      var ta = document.createElement('textarea');
      ta.value = raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    copyBtn.classList.add('copied');
    copyBtn.textContent = 'copied';
    setTimeout(function() {
      copyBtn.classList.remove('copied');
      copyBtn.textContent = 'copy to clipboard';
    }, 2000);
  });
}());
"""

# ── HTML template ─────────────────────────────────────────────────────────────
# Placeholders: __CSS__ __THEME__ __TITLE__ __FILE_PATH__ __TOTAL__
#               __TOTAL_PAD__ __PLURAL__ __SECTIONS_HTML__ __JS__

HTML = r"""<!DOCTYPE html>
<html lang="en" data-theme="__THEME__">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>__TITLE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>__CSS__</style>
</head>
<body>
<a href="#sections" class="skip-link">Skip to sections</a>
<main class="page">

  <div class="topbar">
    <div class="left">
      <span class="aidlc">aidlc</span> &middot; __FILE_PATH__
    </div>
    <div class="topbar-clock right" aria-hidden="true"></div>
  </div>

  <section class="intro">
    <h1 class="intro-title">__TITLE__</h1>
    <p class="intro-lede">__FILE_PATH__</p>
    <div class="intro-meta">
      __TOTAL__ section__PLURAL__<span class="dot">&middot;</span>copy json when done
    </div>
  </section>

  <div class="section-head" id="sections">
    <h2>Sections</h2>
    <div class="count" role="status" aria-live="polite" aria-atomic="true">
      <span class="statusbar-count">00&thinsp;/&thinsp;__TOTAL_PAD__ modified</span>
    </div>
  </div>

__SECTIONS_HTML__
  <footer class="docfoot">
    <span class="left">end of document</span>
    <span>aidlc &middot; paste json back to claude code</span>
  </footer>
</main>

<div class="statusbar" role="region" aria-label="Edit progress">
  <div class="statusbar-info">
    <span class="statusbar-count">00&thinsp;/&thinsp;__TOTAL_PAD__ modified</span>
  </div>
  <div class="statusbar-divider"></div>
  <button type="button" class="export-btn" disabled>copy json</button>
</div>

<div class="modal-overlay" role="dialog" aria-modal="true"
     aria-labelledby="modal-title" aria-hidden="true" style="display:none">
  <div class="modal">
    <header class="modal-head">
      <h3 id="modal-title">aidlc-changes.json</h3>
      <button type="button" class="x" aria-label="Close">&times;</button>
    </header>
    <div class="modal-body"><pre></pre></div>
    <footer class="modal-foot">
      <span class="hint">&rarr; paste into your claude code prompt</span>
      <button type="button" class="copy-btn">copy to clipboard</button>
    </footer>
  </div>
</div>

<script>__JS__</script>
</body>
</html>
"""


# ── Section HTML builder ──────────────────────────────────────────────────────

def render_section(i, total, s):
    body_esc = attr_esc(s["body"])
    rows = max(3, s["body"].count("\n") + 2)

    if s["heading"]:
        htag = f"h{min(s['level'], 6)}"
        head_html = f'<{htag} class="section-heading">{esc(s["heading"])}</{htag}>'
    else:
        head_html = '<div class="preamble-label">preamble</div>'

    num = str(i + 1).zfill(2)
    tot = str(total).zfill(2)
    return (
        f'  <article class="section" id="{s["id"]}">\n'
        f'    <header class="section-header">\n'
        f'      <div class="section-num">{num}.'
        f'<div class="section-num-suffix">of&nbsp;{tot}</div></div>\n'
        f'      <div>{head_html}</div>\n'
        f'    </header>\n'
        f'    <textarea class="section-body"'
        f' data-id="{s["id"]}" data-original="{body_esc}"'
        f' rows="{rows}">{body_esc}</textarea>\n'
        f'  </article>\n'
    )


# ── Renderer ──────────────────────────────────────────────────────────────────

def render(md_path, sections, theme="phosphor"):
    total = len(sections)
    file_str = str(md_path).replace("\\", "/")
    title = next(
        (s["heading"] for s in sections if s["heading"] and s["level"] == 1),
        md_path.stem,
    )

    sections_data = [
        {"id": s["id"], "heading": s["heading"], "level": s["level"], "body": s["body"]}
        for s in sections
    ]

    js_out = (
        JS
        .replace("__FILE_JSON__", json.dumps(file_str))
        .replace("__SECTIONS_JSON__", json.dumps(sections_data, ensure_ascii=False))
    )

    sections_html = "".join(render_section(i, total, s) for i, s in enumerate(sections))

    return (
        HTML
        .replace("__CSS__", CSS)
        .replace("__THEME__", theme)
        .replace("__TITLE__", esc(title))
        .replace("__FILE_PATH__", esc(file_str))
        .replace("__TOTAL__", str(total))
        .replace("__TOTAL_PAD__", str(total).zfill(2))
        .replace("__PLURAL__", "" if total == 1 else "s")
        .replace("__SECTIONS_HTML__", sections_html)
        .replace("__JS__", js_out)
    )


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    md_path = Path(args[0])
    theme = "phosphor"
    if "--theme" in args:
        idx = args.index("--theme")
        if idx + 1 < len(args):
            theme = args[idx + 1]

    if not md_path.exists():
        print(f"error: not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    text = md_path.read_text(encoding="utf-8")
    sections = parse_sections(text)

    out = md_path.with_suffix(".html")
    out.write_text(render(md_path, sections, theme), encoding="utf-8")
    print(f"wrote {out}  ({len(sections)} sections, theme={theme})")


if __name__ == "__main__":
    main()
