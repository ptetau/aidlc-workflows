/* shell.jsx — connected app shell: rail nav, top bar, theme, routing. */
const WORKSPACES = [
  { id: 'clarify', label: 'Clarification', icon: I.clarify, hue: 'var(--primary)', replaces: 'Clarification Documents' },
  { id: 'stories', label: 'Stories', icon: I.stories, hue: 'var(--blue)', replaces: 'Requirements & User Stories' },
  { id: 'arch', label: 'Architecture', icon: I.arch, hue: 'var(--violet)', replaces: 'Application Architecture' },
  { id: 'infra', label: 'Infrastructure', icon: I.infra, hue: 'var(--green)', replaces: 'Infra & Deployment' },
  { id: 'tests', label: 'Tests', icon: I.tests, hue: 'var(--amber)', replaces: 'Test Summaries' },
  { id: 'steering', label: 'Steering', icon: I.steer, hue: 'var(--teal)', replaces: 'Steering Files' },
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
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)', marginTop: 1 }}>billing-service · v3</div>
        </div>
      </div>

      <div className="eyebrow" style={{ padding: '6px 10px 8px' }}>Workspaces</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {WORKSPACES.map(w => {
          const on = w.id === active;
          return (
            <button key={w.id} onClick={() => setActive(w.id)} title={'Replaces: ' + w.replaces} style={{
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 8px 4px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#d8a05f,#c6553f)', flex: '0 0 26px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>PR</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Priya R.</div>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>tech lead</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ active }) {
  const w = WORKSPACES.find(x => x.id === active);
  return (
    <div style={{ height: 54, flex: '0 0 54px', borderBottom: '1px solid var(--line)', display: 'flex',
      alignItems: 'center', gap: 10, padding: '0 24px', background: 'var(--bg)' }}>
      <div className="mono" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-faint)' }}>
        <span>acme/billing-service</span>
        <span style={{ opacity: .5 }}>/</span>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{w.label}</span>
      </div>
      <div style={{ flex: 1 }}></div>
      <div className="pill pill-neutral" title="This screen replaces a static markdown document in the AI-DLC flow">
        replaces · {w.replaces}
      </div>
    </div>
  );
}

function AppShell() {
  const [active, setActive] = useState(() => localStorage.getItem('aidlc-ws') || 'clarify');
  const [theme, setTheme] = useTheme();
  useEffect(() => { localStorage.setItem('aidlc-ws', active); }, [active]);

  const registry = {
    clarify: window.ClarifyWS, stories: window.StoriesWS, arch: window.ArchWS,
    infra: window.InfraWS, tests: window.TestsWS, steering: window.SteeringWS,
  };
  const WS = registry[active] || (() => <div style={{ padding: 40 }} className="muted">Coming soon…</div>);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Rail active={active} setActive={setActive} theme={theme} setTheme={setTheme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar active={active} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} key={active}>
          <div className="fadein" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <WS />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AppShell, WORKSPACES });
