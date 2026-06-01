/* ws-steering.jsx — Steering Policy Center.
   Rule groups (toggles/sliders) the agents must follow, plus project-specific exceptions. */
const { useState: pUseState } = React;

function SteeringWS() {
  const seed = window.SEED.steering;
  const save = useSave();
  const [groups, setGroups] = pUseState(() => JSON.parse(JSON.stringify(seed.groups || [])));
  const [exceptions, setExceptions] = pUseState(seed.exceptions || []);
  const [adding, setAdding] = pUseState(false);
  const [exDraft, setExDraft] = pUseState({ rule: '', scope: '', note: '' });
  const [tab, setTab] = pUseState('rules'); // rules | agents
  const [agents, setAgents] = pUseState(() => seed.agents || {});

  const allRules = groups.flatMap(g => g.rules);
  const activeCount = allRules.filter(r => r.on).length;

  const setRule = (gid, rid, patch) => setGroups(gs => gs.map(g => g.id === gid ? { ...g, rules: g.rules.map(r => r.id === rid ? { ...r, ...patch } : r) } : g));

  // editable state in SEED shape — persisted to workspace/steering.json (sample carried through)
  const buildState = () => ({ groups, exceptions, sample: seed.sample, agents });

  return (
    <>
      <WorkHeader eyebrow="Steering Policy Center"
        title={tab === 'rules' ? 'Govern the agents' : 'AGENTS.md'}
        desc={tab === 'rules'
          ? 'The standards every agent must follow when building this project. Toggle rules and record project-specific exceptions.'
          : 'The AI steering document written to the project root — what an agent reads first to orient.'}
        right={<>
          <Segmented options={[{ value: 'rules', label: 'Rules' }, { value: 'agents', label: 'AGENTS.md' }]} value={tab} onChange={setTab} />
          {tab === 'rules' && <span className="pill pill-clay">{activeCount} active rules</span>}
          <Btn kind="primary" icon={I.check} onClick={() => save('steering', buildState())}>Save</Btn>
        </>} />

      {tab === 'agents' && <AgentsDoc agents={agents} setAgents={setAgents} />}

      <div style={{ flex: 1, minHeight: 0, display: tab === 'rules' ? 'flex' : 'none' }}>
        {/* rules */}
        <div className="scroll" style={{ flex: 1, minWidth: 0, padding: '22px max(22px, calc((100% - 720px) / 2))' }}>
          {groups.map(g => (
            <div key={g.id} style={{ marginBottom: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>{g.title}</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {g.rules.map((r, i) => (
                  <div key={r.id} style={{ padding: '13px 15px', borderTop: i ? '1px solid var(--line)' : 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: r.on ? 'var(--ink)' : 'var(--ink-faint)' }}>{r.label}</span>
                      <Switch on={r.on} onChange={v => setRule(g.id, r.id, { on: v })} />
                    </div>
                    {r.kind === 'slider' && r.on && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="range" className="range" min={r.min} max={r.max} step={r.step} value={r.value} onChange={e => setRule(g.id, r.id, { value: +e.target.value })} style={{ flex: 1 }} />
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, width: 36, textAlign: 'right' }}>{r.value}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* exceptions */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <span className="eyebrow">Project exceptions</span>
            <button onClick={() => { setAdding(true); setExDraft({ rule: allRules[0].label, scope: '', note: '' }); }} className="mono"
              style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, display: 'flex' }}>{I.plus}</span>override</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {exceptions.map(e => (
              <div key={e.id} className="card" style={{ padding: '11px 13px', boxShadow: 'none', borderStyle: 'dashed' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="pill pill-amber" style={{ fontSize: 9.5 }}>OVERRIDE</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{e.rule}</span>
                  <button onClick={() => setExceptions(xs => xs.filter(x => x.id !== e.id))} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', width: 18, height: 18 }}>
                    <span style={{ width: 12, height: 12, display: 'flex' }}>{I.x}</span></button>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--primary-deep)', marginBottom: 3 }}>{e.scope}</div>
                <div className="softline" style={{ fontSize: 11.5, lineHeight: 1.4 }}>{e.note}</div>
              </div>
            ))}
            {adding && (
              <div className="card" style={{ padding: 13, borderColor: 'var(--primary-line)' }}>
                <select className="select" value={exDraft.rule} onChange={e => setExDraft(d => ({ ...d, rule: e.target.value }))} style={{ marginBottom: 8 }}>
                  {allRules.map(r => <option key={r.id} value={r.label}>{r.label}</option>)}
                </select>
                <input className="input mono" placeholder="scope · e.g. src/migrations/**" value={exDraft.scope} onChange={e => setExDraft(d => ({ ...d, scope: e.target.value }))} style={{ marginBottom: 8, fontSize: 12 }} />
                <input className="input" placeholder="why this exception?" value={exDraft.note} onChange={e => setExDraft(d => ({ ...d, note: e.target.value }))} style={{ marginBottom: 10, fontSize: 12.5 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn kind="primary" sm onClick={() => {
                    if (!exDraft.scope.trim()) return;
                    setExceptions(xs => [...xs, { id: 'x' + Date.now(), rule: exDraft.rule, scope: exDraft.scope, note: exDraft.note || 'Manual exception.' }]);
                    setAdding(false);
                  }}>Add exception</Btn>
                  <Btn kind="ghost" sm onClick={() => setAdding(false)}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

/* ---- AGENTS.md tab — the root steering doc, section by section ---- */
const AGENTS_SECTIONS = [
  ['overview', 'Project overview', 'What this project is, in 2–3 sentences.'],
  ['techStack', 'Tech stack', 'Languages, frameworks, key libraries + versions.'],
  ['repoStructure', 'Repository structure', 'Top-level layout and where things live.'],
  ['buildAndRun', 'Build & run', 'Commands to install, build, run, and test.'],
  ['conventions', 'Key conventions', 'Naming, patterns, do/don’t the agent must follow.'],
  ['architectureDecisions', 'Architecture decisions', 'Load-bearing choices and why.'],
];
function AgentsDoc({ agents, setAgents }) {
  return (
    <div className="scroll fadein" style={{ flex: 1, minHeight: 0, padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 820 }}>
      <div className="card" style={{ padding: '11px 14px', boxShadow: 'none', borderColor: 'var(--line)' }}>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Generated to <b>AGENTS.md</b> at the project root — regenerated at the end of Construction. Markdown is allowed in each field.</span>
      </div>
      {AGENTS_SECTIONS.map(([key, label, hint]) => (
        <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">{label}</span>
          <span className="muted" style={{ fontSize: 11.5, marginTop: -3 }}>{hint}</span>
          <textarea className="textarea" rows={key === 'overview' ? 3 : 4} value={agents[key] || ''}
            onChange={e => setAgents({ ...agents, [key]: e.target.value })} style={{ fontSize: 12.5, lineHeight: 1.55 }} />
        </label>
      ))}
    </div>
  );
}

window.SteeringWS = SteeringWS;
