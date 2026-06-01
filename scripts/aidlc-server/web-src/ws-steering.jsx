/* ws-steering.jsx — Steering Policy Center.
   Rule groups (toggles/sliders), project-specific exceptions, and a live
   Playground that rewrites pasted code according to the active policies. */
const { useState: pUseState } = React;

function rewrite(code, active, maxLen) {
  let out = code; const changes = [];
  if (active.r7) {
    const before = out;
    out = out.replace(/\b([a-z]+)(_[a-z]+)+\b/g, m => m.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
    if (out !== before) changes.push({ rule: 'camelCase functions', desc: 'snake_case → camelCase' });
  }
  if (active.r4) {
    const before = out;
    out = out.replace(/(\d+)\.0+\b/g, '$1');
    if (out !== before) changes.push({ rule: 'Integer cents', desc: 'float literals → integers' });
    if (/total\s*=\s*total\s*\+/.test(out)) { out = out.replace(/var total = 0/, 'let total = 0 /* cents */'); }
  }
  if (active.r2) {
    const before = out;
    out = out.replace(/"([^"]*)"/g, "'$1'");
    if (out !== before) changes.push({ rule: 'Single quotes', desc: 'double → single quotes' });
  }
  if (active.r1) {
    const before = out;
    out = out.split('\n').map(l => {
      const t = l.trimEnd();
      if (t && !/[;{}\(]$/.test(t) && !/^\s*(\/\/|function|for|if|else|while|})/.test(t) && !t.endsWith(',')) return l.replace(/\s*$/, '') + ';';
      return l;
    }).join('\n');
    if (out !== before) changes.push({ rule: 'Semicolons', desc: 'added missing semicolons' });
  }
  if (active.r6) {
    const before = out;
    out = out.replace(/\bvar\b/g, 'const').replace(/const total = 0/, 'let total = 0');
    if (out !== before) changes.push({ rule: 'Modern declarations', desc: 'var → const/let' });
  }
  const longLines = active.r3 ? out.split('\n').filter(l => l.length > maxLen).length : 0;
  if (longLines) changes.push({ rule: 'Max line length', desc: `${longLines} line(s) exceed ${maxLen} cols` });
  return { out, changes };
}

function SteeringWS() {
  const seed = window.SEED.steering;
  const copyJSON = useCopyJSON();   // used only for the Playground's rewrite copy
  const save = useSave();
  const [groups, setGroups] = pUseState(() => JSON.parse(JSON.stringify(seed.groups)));
  const [exceptions, setExceptions] = pUseState(seed.exceptions);
  const [code, setCode] = pUseState(seed.sample);
  const [adding, setAdding] = pUseState(false);
  const [exDraft, setExDraft] = pUseState({ rule: '', scope: '', note: '' });

  const allRules = groups.flatMap(g => g.rules);
  const active = Object.fromEntries(allRules.map(r => [r.id, r.on]));
  const maxLen = (allRules.find(r => r.id === 'r3') || {}).value || 100;
  const activeCount = allRules.filter(r => r.on).length;
  const result = rewrite(code, active, maxLen);

  const setRule = (gid, rid, patch) => setGroups(gs => gs.map(g => g.id === gid ? { ...g, rules: g.rules.map(r => r.id === rid ? { ...r, ...patch } : r) } : g));

  // editable state in SEED shape — persisted to workspace/steering.json
  const buildState = () => ({ groups, exceptions, sample: code });

  return (
    <>
      <WorkHeader eyebrow="Steering Policy Center" title="Govern the agents"
        desc="Toggle the standards the AI must follow. Test them in the Playground: paste code and see exactly how it gets rewritten."
        right={<>
          <span className="pill pill-clay">{activeCount} active rules</span>
          <Btn kind="primary" icon={I.check} onClick={() => save('steering', buildState())}>Save</Btn>
        </>} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* rules */}
        <div className="scroll" style={{ width: 420, flex: '0 0 420px', borderRight: '1px solid var(--line)', padding: 22 }}>
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

        {/* playground */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)' }}>
          <div style={{ padding: '16px 22px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 17, height: 17, display: 'flex', color: 'var(--primary)' }}>{I.bolt}</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Policy Playground</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>see how the AI rewrites code under the active rules</div>
            </div>
          </div>
          <div className="scroll" style={{ flex: 1, padding: '4px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Your code</div>
              <textarea className="textarea mono scroll" spellCheck={false} value={code} onChange={e => setCode(e.target.value)} rows={7}
                style={{ fontSize: 12.5, lineHeight: 1.6, background: 'var(--surface)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span className="eyebrow">AI-rewritten output</span>
                {result.changes.length > 0
                  ? <span className="pill pill-green" style={{ fontSize: 9.5 }}>{result.changes.length} rule{result.changes.length > 1 ? 's' : ''} applied</span>
                  : <span className="pill pill-neutral" style={{ fontSize: 9.5 }}>no changes</span>}
                <Btn kind="soft" sm icon={I.copy} onClick={() => copyJSON({ input: code, output: result.out, appliedRules: result.changes }, 'rewrite')} style={{ marginLeft: 'auto' }}>Copy</Btn>
              </div>
              <pre className="mono scroll" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, background: 'var(--surface)', border: '1px solid var(--green-line)', borderRadius: 11, padding: 14, color: 'var(--ink)', overflow: 'auto', maxHeight: 220 }}>{result.out}</pre>
            </div>
            {result.changes.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>What changed & why</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {result.changes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12 }}>
                      <span style={{ width: 15, height: 15, display: 'flex', color: 'var(--green)', flex: '0 0 15px' }}>{I.check}</span>
                      <span style={{ fontWeight: 600 }}>{c.rule}</span>
                      <span className="softline">— {c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

window.SteeringWS = SteeringWS;
