/* shared.jsx — icons + UI primitives shared across all workspaces.
   Exports to window so other babel scripts can use them. */
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

/* ---------------- ICONS (simple line glyphs) ---------------- */
const I = {
  clarify: <svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="3.5" width="15" height="10" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 16.5l-1-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="7" cy="8.5" r="1" fill="currentColor"/><circle cx="10" cy="8.5" r="1" fill="currentColor"/><circle cx="13" cy="8.5" r="1" fill="currentColor"/></svg>,
  stories: <svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="3.5" width="15" height="3.4" rx="1.4" stroke="currentColor" strokeWidth="1.6"/><rect x="2.5" y="8.7" width="10" height="3.4" rx="1.4" stroke="currentColor" strokeWidth="1.6"/><rect x="2.5" y="13.9" width="13" height="3.4" rx="1.4" stroke="currentColor" strokeWidth="1.6"/></svg>,
  arch: <svg viewBox="0 0 20 20" fill="none"><circle cx="4.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="15.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.7 6.2L13 6.7M6 7.3l2.2 6M13.5 9.3l-3.3 4.3" stroke="currentColor" strokeWidth="1.4"/></svg>,
  infra: <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3.5" width="14" height="5" rx="1.6" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="11.5" width="14" height="5" rx="1.6" stroke="currentColor" strokeWidth="1.6"/><circle cx="6.5" cy="6" r="1" fill="currentColor"/><circle cx="6.5" cy="14" r="1" fill="currentColor"/></svg>,
  tests: <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 10.2l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  steer: <svg viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="7.5" cy="6" r="2.4" fill="currentColor"/><circle cx="12.5" cy="14" r="2.4" fill="currentColor"/></svg>,
  star: <svg viewBox="0 0 20 20" fill="none"><path d="M10 2.5l2.2 4.5 4.8.6-3.5 3.3 1 4.8L10 13.6 5.5 15.7l1-4.8L3 7.6l4.8-.6z" fill="currentColor"/></svg>,
  copy: <svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 13.5h6a1.5 1.5 0 001.5-1.5v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  check: <svg viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus: <svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  x: <svg viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  chevD: <svg viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: <svg viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sun: <svg viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3.4" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.8 3.8l1.4 1.4M12.8 12.8l1.4 1.4M14.2 3.8l-1.4 1.4M5.2 12.8l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  moon: <svg viewBox="0 0 18 18" fill="none"><path d="M15 10.5A6.5 6.5 0 017.5 3a6.5 6.5 0 102.999 12.3 6.51 6.51 0 004.5-4.8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  note: <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 3.5h11v6l-4 4h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M13.5 9.5h-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  trash: <svg viewBox="0 0 16 16" fill="none"><path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  edit: <svg viewBox="0 0 16 16" fill="none"><path d="M11 2.5l2.5 2.5L6 12.5l-3 .5.5-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  play: <svg viewBox="0 0 16 16" fill="none"><path d="M5 3.5l7 4.5-7 4.5z" fill="currentColor"/></svg>,
  flag: <svg viewBox="0 0 16 16" fill="none"><path d="M4 2v12M4 3h8l-1.5 2.5L12 8H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bolt: <svg viewBox="0 0 16 16" fill="none"><path d="M9 2L4 9h3l-1 5 5-7H8z" fill="currentColor"/></svg>,
  db: <svg viewBox="0 0 18 18" fill="none"><ellipse cx="9" cy="4.5" rx="5.5" ry="2.2" stroke="currentColor" strokeWidth="1.5"/><path d="M3.5 4.5v9c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2v-9M3.5 9c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2" stroke="currentColor" strokeWidth="1.5"/></svg>,
  api: <svg viewBox="0 0 18 18" fill="none"><rect x="2.5" y="5" width="13" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 9h2M10.5 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  ui: <svg viewBox="0 0 18 18" fill="none"><rect x="2.5" y="3.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 6.5h13" stroke="currentColor" strokeWidth="1.5"/></svg>,
  queue: <svg viewBox="0 0 18 18" fill="none"><rect x="2.5" y="6" width="3.5" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="7.5" y="6" width="3.5" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="12.5" y="6" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  search: <svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  warn: <svg viewBox="0 0 16 16" fill="none"><path d="M8 2l6 11H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.3" r=".9" fill="currentColor"/></svg>,
  shield: <svg viewBox="0 0 16 16" fill="none"><path d="M8 2l5 2v4c0 3-2.2 5.3-5 6.5C5.2 13.3 3 11 3 8V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  link: <svg viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  grip: <svg viewBox="0 0 16 16" fill="none"><circle cx="6" cy="4" r="1.1" fill="currentColor"/><circle cx="10" cy="4" r="1.1" fill="currentColor"/><circle cx="6" cy="8" r="1.1" fill="currentColor"/><circle cx="10" cy="8" r="1.1" fill="currentColor"/><circle cx="6" cy="12" r="1.1" fill="currentColor"/><circle cx="10" cy="12" r="1.1" fill="currentColor"/></svg>,
  reset: <svg viewBox="0 0 16 16" fill="none"><path d="M3 8a5 5 0 105-5 5 5 0 00-3.8 1.8M3.2 2.5v2.3h2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

/* ---------------- TOAST ---------------- */
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((node) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, node }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => <div className="toast" key={t.id}>{t.node}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

/* copy JSON helper hook — returns a fn that copies + toasts */
function useCopyJSON() {
  const push = useToast();
  return useCallback((obj, label) => {
    const text = JSON.stringify(obj, null, 2);
    const done = () => push(<>
      <span className="tdot"></span>
      <span>Copied <b>{label || 'payload'}</b> · <code>{text.length.toLocaleString()} chars</code> of JSON to clipboard</span>
    </>);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
    return text;
  }, [push]);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

/* ---------------- SAVE (persist a workspace document to the server) ---------------- */
/* POSTs the editable document (SEED shape) back to aidlc-server, which writes it to
   aidlc-docs/workspace/<id>.json and appends a `user` digest entry describing the change. */
function saveWorkspace(id, doc, note) {
  return fetch('/api/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace: id, document: doc, note: note || null }),
  });
}
/* hook: returns save(id, doc, note) that persists + toasts + notifies the digest panel */
function useSave() {
  const push = useToast();
  return useCallback((id, doc, note) => {
    return saveWorkspace(id, doc, note).then(r => {
      if (!r.ok) throw new Error('save failed');
      push(<><span className="tdot"></span><span>Saved <b>{id}</b> — digest recorded</span></>);
      window.dispatchEvent(new CustomEvent('aidlc-saved', { detail: { id } }));
    }).catch(() => push(<>
      <span className="tdot" style={{ background: 'var(--danger)' }}></span>
      <span>Save failed — is <code>aidlc-server</code> running?</span></>));
  }, [push]);
}

/* ---------------- BUTTON ---------------- */
function Btn({ kind = 'ghost', sm, icon, children, onClick, disabled, title, style, type = 'button', ...p }) {
  const cls = `btn btn-${kind}${sm ? ' btn-sm' : ''}${!children ? ' btn-icon' : ''}`;
  const aria = {}; Object.keys(p).forEach(k => { if (k.startsWith('aria-') || k === 'role') aria[k] = p[k]; });
  return <button className={cls} onClick={onClick} disabled={disabled} title={title} style={style} type={type} {...aria}>{icon}{children}</button>;
}

/* ---------------- MODAL ---------------- */
function Modal({ title, eyebrow, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { maxWidth: 820 } : null} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div style={{ flex: 1 }}>
            {eyebrow && <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
            <div className="serif" style={{ fontSize: 21, lineHeight: 1.1 }}>{title}</div>
          </div>
          <Btn icon={I.x} onClick={onClose} aria-label="Close" />
        </div>
        <div className="modal-bd scroll">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- SWITCH ---------------- */
function Switch({ on, onChange }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
    <span className="knob"></span>
  </button>;
}

/* ---------------- SEGMENTED ---------------- */
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-3)', borderRadius: 9, padding: 3, gap: 2 }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const active = v === value;
        return <button key={v} onClick={() => onChange(v)} className="mono" style={{
          border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, padding: '6px 12px',
          borderRadius: 7, letterSpacing: '.02em',
          background: active ? 'var(--surface)' : 'transparent',
          color: active ? 'var(--ink)' : 'var(--ink-faint)',
          boxShadow: active ? 'var(--shadow-sm)' : 'none', transition: 'all .14s',
        }}>{label}</button>;
      })}
    </div>
  );
}

/* ---------------- WORKSPACE HEADER (shared chrome) ---------------- */
function WorkHeader({ title, eyebrow, desc, right }) {
  return (
    <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-end', gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 7 }}>{eyebrow}</div>
        <h1 className="serif" style={{ margin: 0, fontSize: 27, lineHeight: 1.05 }}>{title}</h1>
        {desc && <p className="softline" style={{ margin: '8px 0 0', fontSize: 13.5, maxWidth: 620, lineHeight: 1.5 }}>{desc}</p>}
      </div>
      {right && <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/* ---------------- MARKDOWN DOC (rendered, with working anchors + links) ----------------
   Renders markdown via marked, gives every heading a slug id (so #anchor links resolve),
   smooth-scrolls in-page `#` links, and (when onOpenDoc is given) routes `*.md` links to load
   that doc. `scrollAnchor` scrolls to an anchor once after render (for cross-doc deep links). */
function slugify(s) {
  return (s || '').toLowerCase().trim().replace(/[`'"]/g, '').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
}
function MarkdownDoc({ markdown, onOpenDoc, scrollAnchor }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = window.marked ? window.marked.parse(markdown || '') : ('<pre>' + (markdown || '') + '</pre>');
    // give headings stable ids so in-page anchors work
    el.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => { if (!h.id) h.id = slugify(h.textContent); });
    const scrollToId = (id) => {
      let t = null;
      try { t = el.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id)); } catch (e) { t = null; }
      if (!t) el.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => { if (!t && h.id.toLowerCase() === id.toLowerCase()) t = h; });
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return !!t;
    };
    const onClick = (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#')) { e.preventDefault(); scrollToId(decodeURIComponent(href.slice(1))); }
      else if (/\.md(\?|#|$)/i.test(href) && onOpenDoc && !/^https?:/i.test(href)) {
        e.preventDefault();
        const [path, anchor] = href.split('#');
        onOpenDoc(path, anchor || '');
      }
      // external (http) links fall through to default behaviour
    };
    el.addEventListener('click', onClick);
    if (scrollAnchor) { const id = setTimeout(() => scrollToId(scrollAnchor), 60); return () => { el.removeEventListener('click', onClick); clearTimeout(id); }; }
    return () => el.removeEventListener('click', onClick);
  }, [markdown, scrollAnchor]);
  return <div className="doc-md" ref={ref} />;
}

// resolve a doc-relative href (e.g. "../requirements/x.md") against a base doc path → aidlc-docs-rel path
function resolveDocHref(baseDocPath, href) {
  href = (href || '').replace(/^\.\//, '');
  if (href.startsWith('/')) return href.replace(/^\/+/, '');
  const baseDir = baseDocPath.includes('/') ? baseDocPath.slice(0, baseDocPath.lastIndexOf('/')) : '';
  const parts = (baseDir ? baseDir.split('/') : []).concat(href.split('/'));
  const out = [];
  for (const p of parts) { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }
  return out.join('/');
}

/* ---------------- CROSS-WORKSPACE NAVIGATION (traceability links) ----------------
   Items carry data-anchor="<id>"; a ref chip calls window.aidlcGoto(ws, tab, anchor), which the
   AppShell turns into "switch workspace + (optional) sub-tab + scroll to the item + flash it".
   Pure UX over IDs already in the JSON — no data/ledger change. */
function scrollToAnchor(anchor, tries) {
  if (!anchor) return;
  let n = 0;
  const max = tries || 25;
  const find = () => Array.from(document.querySelectorAll('[data-anchor]')).find(e => e.getAttribute('data-anchor') === anchor);
  const tick = () => {
    const el = find();
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('anchor-flash');
      setTimeout(() => el.classList.remove('anchor-flash'), 1600);
    } else if (n++ < max) {
      setTimeout(tick, 60);
    }
  };
  tick();
}
// workspaces call this on mount to honour a pending navigation (switch sub-tab, scroll to anchor)
function usePendingNav(applyTab) {
  useEffect(() => {
    const nav = window.__aidlcPendingNav;
    if (!nav) return;
    window.__aidlcPendingNav = null;
    if (nav.tab && applyTab) applyTab(nav.tab);
    scrollToAnchor(nav.anchor);
  }, []);
}
// a clickable traceability reference (e.g. an FR id on a business rule)
function RefChip({ children, ws, tab, anchor, title }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); if (window.aidlcGoto) window.aidlcGoto(ws, tab, anchor); }}
      className="mono" title={title || ('Go to ' + anchor)} style={{
        border: '1px solid var(--primary-line)', background: 'var(--primary-wash)', color: 'var(--primary-deep)',
        cursor: 'pointer', borderRadius: 7, padding: '2px 8px', fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap',
      }}>{children}</button>
  );
}

Object.assign(window, { I, ToastProvider, useToast, useCopyJSON, saveWorkspace, useSave, Btn, Modal, Switch, Segmented, WorkHeader, MarkdownDoc, slugify, resolveDocHref, usePendingNav, scrollToAnchor, RefChip });
