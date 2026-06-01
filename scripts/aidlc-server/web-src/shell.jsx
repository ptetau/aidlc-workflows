/* shell.jsx — connected app shell: rail nav, top bar, theme, routing. */
const WORKSPACES = [
  { id: 'clarify', label: 'Clarification', icon: I.clarify, hue: 'var(--primary)', phase: 'Inception' },
  { id: 'stories', label: 'Stories', icon: I.stories, hue: 'var(--blue)', phase: 'Inception' },
  { id: 'arch', label: 'Architecture', icon: I.arch, hue: 'var(--violet)', phase: 'Inception' },
  { id: 'infra', label: 'Infrastructure', icon: I.infra, hue: 'var(--green)', phase: 'Construction' },
  { id: 'tests', label: 'Tests', icon: I.tests, hue: 'var(--amber)', phase: 'Construction' },
  { id: 'steering', label: 'Steering', icon: I.steer, hue: 'var(--teal)', phase: 'Steering' },
];
// nav groups, in workflow order — Steering is cross-cutting, shown after a divider
const NAV_GROUPS = [
  { phase: 'Inception', items: WORKSPACES.filter(w => w.phase === 'Inception') },
  { phase: 'Construction', items: WORKSPACES.filter(w => w.phase === 'Construction') },
  { phase: 'Steering', items: WORKSPACES.filter(w => w.phase === 'Steering') },
];

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('aidlc-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aidlc-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function Rail({ active, setActive, theme, setTheme }) {
  return (
    <div style={{
      width: 224, flex: '0 0 224px', background: 'var(--rail)', borderRight: '1px solid var(--rail-line)',
      display: 'flex', flexDirection: 'column', padding: '18px 14px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 20px' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 30px' }}>
          <span style={{ width: 16, height: 16, display: 'block' }}>{I.star}</span>
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div className="serif" style={{ fontSize: 17 }}>Lifecycle</div>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)', marginTop: 1 }}>
            {(() => { const p = (window.SEED && window.SEED.project) || {}; return `${p.name || 'project'}${p.version ? ' · ' + p.version : ''}`; })()}
          </div>
        </div>
      </div>

      <nav className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: '0 1 auto' }}>
        {NAV_GROUPS.map((g, gi) => (
          <div key={g.phase} style={{ marginBottom: 8 }}>
            {g.phase === 'Steering'
              ? <div className="hr" style={{ margin: '4px 10px 10px' }}></div>
              : null}
            <div className="eyebrow" style={{ padding: gi === 0 ? '6px 10px 8px' : '2px 10px 8px' }}>
              {g.phase === 'Steering' ? 'Cross-cutting' : g.phase}
            </div>
            {g.items.map(w => {
              const on = w.id === active;
              return (
                <button key={w.id} onClick={() => setActive(w.id)} title={w.phase} style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 9,
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', font: 'inherit',
                  fontSize: 13.5, fontWeight: on ? 650 : 500,
                  background: on ? 'var(--surface)' : 'transparent',
                  color: on ? 'var(--ink)' : 'var(--ink-soft)',
                  boxShadow: on ? 'var(--shadow-sm)' : 'none', transition: 'background .14s, color .14s',
                }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(120,90,50,.06)'; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ width: 20, height: 20, display: 'flex', color: on ? w.hue : 'var(--ink-faint)', flex: '0 0 20px' }}>{w.icon}</span>
                  <span style={{ flex: 1 }}>{w.label}</span>
                  {on && <span style={{ width: 6, height: 6, borderRadius: 3, background: w.hue }}></span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 10, padding: 3, border: '1px solid var(--line)' }}>
          {[['light', I.sun, 'Light'], ['dark', I.moon, 'Dark']].map(([k, ic, lbl]) => (
            <button key={k} onClick={() => setTheme(k)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: 'none', cursor: 'pointer', borderRadius: 7, padding: '6px 8px', font: 'inherit',
              fontSize: 12, fontWeight: 600,
              background: theme === k ? 'var(--surface)' : 'transparent',
              color: theme === k ? 'var(--ink)' : 'var(--ink-faint)',
              boxShadow: theme === k ? 'var(--shadow-sm)' : 'none',
            }}>
              <span style={{ width: 15, height: 15, display: 'flex' }}>{ic}</span>{lbl}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px 4px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flex: '0 0 7px' }}></span>
          <div className="mono" style={{ lineHeight: 1.3, minWidth: 0 }}>
            {(() => {
              const p = (window.SEED && window.SEED.project) || {};
              return <>
                <div style={{ fontSize: 10, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.branch ? 'branch ' + p.branch : 'local workspace'}</div>
                <div style={{ fontSize: 9, color: 'var(--ink-faint)' }}>aidlc · local</div>
              </>;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ active, onOpenDigest, unread }) {
  const w = WORKSPACES.find(x => x.id === active);
  const repo = (window.SEED && window.SEED.project && window.SEED.project.repo) || 'project';
  return (
    <div style={{ height: 54, flex: '0 0 54px', borderBottom: '1px solid var(--line)', display: 'flex',
      alignItems: 'center', gap: 10, padding: '0 24px', background: 'var(--bg)' }}>
      <div className="mono" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-faint)' }}>
        <span>{repo}</span>
        <span style={{ opacity: .5 }}>/</span>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{w.label}</span>
      </div>
      <div style={{ flex: 1 }}></div>
      <div className="pill pill-neutral" title={w.phase === 'Steering' ? 'Cross-cutting policy — applies across phases' : 'AI-DLC phase'}>
        {w.phase === 'Steering' ? 'cross-cutting' : w.phase.toLowerCase()}
      </div>
      <button onClick={onOpenDigest} title="Digest — the change-conversation with aidlc" style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 7, marginLeft: 4,
        border: '1px solid var(--line-2)', background: 'var(--surface)', cursor: 'pointer',
        borderRadius: 9, padding: '6px 11px', font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
        <span style={{ width: 15, height: 15, display: 'flex' }}>{I.note}</span>Digest
        {unread > 0 && <span className="mono" style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
          background: 'var(--primary)', color: '#fff', fontSize: 9.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
      </button>
    </div>
  );
}

/* ---------------- DIGEST PANEL ----------------
   The change-conversation between the user and aidlc. `user` entries are recorded
   by the server on Save; `agent` entries are appended by `/aidlc ingest`. The panel
   polls /api/digests so an ingest's ack + next-steps appears automatically. */
function relTime(ts) {
  const then = Date.parse(ts); if (isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function DigestEntry({ e }) {
  const agent = e.actor === 'agent';
  const [open, setOpen] = useState(false);
  const changes = Array.isArray(e.changes) ? e.changes : [];
  const steps = Array.isArray(e.nextSteps) ? e.nextSteps : (e.nextSteps ? [e.nextSteps] : []);
  return (
    <div className="card fadein" style={{ padding: '12px 13px', boxShadow: 'none',
      borderColor: agent ? 'var(--primary-line)' : 'var(--line)',
      background: agent ? 'var(--primary-wash)' : 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span className={`pill pill-${agent ? 'clay' : 'neutral'}`} style={{ fontSize: 9 }}>
          {agent ? 'aidlc' : 'you'}</span>
        {e.workspace && <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>{e.workspace}</span>}
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--ink-faint)' }}>{relTime(e.ts)}</span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)' }}>{e.summary}</div>
      {steps.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="eyebrow" style={{ marginBottom: 5 }}>Next steps</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {steps.map((s, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink-soft)' }}>{s}</li>)}
          </ul>
        </div>
      )}
      {changes.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setOpen(o => !o)} className="mono" style={{ border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 10.5, fontWeight: 600, padding: 0,
            display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, display: 'flex', transform: open ? 'rotate(90deg)' : 'none' }}>{I.chevR}</span>
            {changes.length} field change{changes.length > 1 ? 's' : ''}
          </button>
          {open && <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {changes.map((c, i) => (
              <div key={i} className="mono" style={{ fontSize: 10.5, lineHeight: 1.5, background: 'var(--surface-2)',
                border: '1px solid var(--line)', borderRadius: 7, padding: '6px 8px' }}>
                <div style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>{c.field}</div>
                {c.before !== undefined && <div style={{ color: 'var(--danger)' }}>− {String(c.before)}</div>}
                {c.after !== undefined && <div style={{ color: 'var(--green-deep)' }}>+ {String(c.after)}</div>}
              </div>
            ))}
          </div>}
        </div>
      )}
    </div>
  );
}

function DigestDrawer({ open, onClose, digests }) {
  const ordered = [...digests].reverse(); // newest first
  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(30,18,8,.32)',
        zIndex: 7000, animation: 'fade .18s ease' }} />}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 360, maxWidth: '92vw', zIndex: 7001,
        background: 'var(--rail)', borderLeft: '1px solid var(--rail-line)', boxShadow: 'var(--shadow-lg)',
        transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .24s cubic-bezier(.2,.8,.3,1)',
        display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--rail-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--ink-faint)' }}>{I.note}</span>
          <div style={{ flex: 1 }}>
            <div className="serif" style={{ fontSize: 16 }}>Digest</div>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>save here · run <b>/aidlc ingest</b> to get a reply</div>
          </div>
          <Btn icon={I.x} onClick={onClose} aria-label="Close digest" />
        </div>
        <div className="scroll" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ordered.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '40px 14px', fontSize: 12.5, lineHeight: 1.6 }}>
              No changes yet. Edit a workspace and hit <b>Save</b> — your change is recorded here, then
              run <code>/aidlc ingest</code> and aidlc replies with what it did and your next steps.
            </div>
          )}
          {ordered.map((e, i) => <DigestEntry key={e.id || i} e={e} />)}
        </div>
      </div>
    </>
  );
}

function AppShell() {
  const [active, setActive] = useState(() => localStorage.getItem('aidlc-ws') || 'clarify');
  const [theme, setTheme] = useTheme();
  const [digests, setDigests] = useState([]);
  const [digestOpen, setDigestOpen] = useState(false);
  // unread tracks new AGENT replies (ingest acks) only — a user's own Save shouldn't badge them
  const [seenAgent, setSeenAgent] = useState(() => +(localStorage.getItem('aidlc-digest-seen-agent') || 0));
  useEffect(() => { localStorage.setItem('aidlc-ws', active); }, [active]);

  // poll the digest ledger; also refresh immediately after a local Save
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/digests').then(r => r.ok ? r.json() : [])
      .then(d => { if (alive && Array.isArray(d)) setDigests(d); }).catch(() => {});
    load();
    const iv = setInterval(load, 3000);
    const onSaved = () => load();
    window.addEventListener('aidlc-saved', onSaved);
    return () => { alive = false; clearInterval(iv); window.removeEventListener('aidlc-saved', onSaved); };
  }, []);

  // unread = agent replies appended since the drawer was last opened
  const agentCount = digests.filter(d => d.actor === 'agent').length;
  const unread = Math.max(0, agentCount - seenAgent);
  const openDigest = () => { setDigestOpen(true); setSeenAgent(agentCount); localStorage.setItem('aidlc-digest-seen-agent', String(agentCount)); };

  const registry = {
    clarify: window.ClarifyWS, stories: window.StoriesWS, arch: window.ArchWS,
    infra: window.InfraWS, tests: window.TestsWS, steering: window.SteeringWS,
  };
  const WS = registry[active] || (() => <div style={{ padding: 40 }} className="muted">Coming soon…</div>);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Rail active={active} setActive={setActive} theme={theme} setTheme={setTheme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar active={active} onOpenDigest={openDigest} unread={unread} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} key={active}>
          <div className="fadein" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <WS />
          </div>
        </div>
      </div>
      <DigestDrawer open={digestOpen} onClose={() => setDigestOpen(false)} digests={digests} />
    </div>
  );
}

Object.assign(window, { AppShell, WORKSPACES });
