/* ws-tests.jsx — Test matrix: components × test types.
   Status (pass/fail/none) reflects real build-and-test results the agent records — the UI does
   not run tests, so there is no fake execution. Humans can edit scripts and correct status. */
const { useState: tUseState } = React;

const ST = {
  pass: { color: 'var(--green)', bg: 'var(--green-wash)', line: 'var(--green-line)', label: 'pass' },
  fail: { color: 'var(--danger)', bg: 'var(--danger-wash)', line: 'var(--danger)', label: 'fail' },
  none: { color: 'var(--ink-faint)', bg: 'var(--surface-2)', line: 'var(--line)', label: '—' },
};

function TestsWS() {
  const seed = window.SEED.tests;
  const save = useSave();
  const [cells, setCells] = tUseState(() => JSON.parse(JSON.stringify(seed.cells || {})));
  // default selection derived from real data (never a hardcoded id)
  const [sel, setSel] = tUseState(() => (seed.components && seed.components[0]) ? seed.components[0].id + '-0' : '');
  const [tab, setTab] = tUseState('matrix'); // matrix | summary
  const [summary, setSummary] = tUseState(() => seed.summary || { builds: [], businessRulesVerified: [], readyForOperations: false });

  const key = (ci, ti) => `${seed.components[ci].id}-${ti}`;
  const selCell = cells[sel] || { status: 'none', code: '' };
  const [selC, selT] = (() => {
    const i = sel.lastIndexOf('-');
    const cid = i >= 0 ? sel.slice(0, i) : sel;
    const t = i >= 0 ? +sel.slice(i + 1) : 0;
    return [(seed.components || []).find(c => c.id === cid), (seed.types || [])[t]];
  })();

  const setCode = code => setCells(cs => ({ ...cs, [sel]: { ...(cs[sel] || { status: 'none' }), code } }));
  const setStatus = status => setCells(cs => ({ ...cs, [sel]: { ...(cs[sel] || { code: '' }), status } }));
  const genTemplate = () => setCells(cs => ({ ...cs, [sel]: { status: 'none', code: `it('${(selC ? selC.name : 'component').toLowerCase()} · ${(selT || 'test').toLowerCase()}', () => {\n  // arrange\n  // act\n  // assert\n  expect(true).toBe(true)\n})` } }));

  const tally = Object.values(cells).reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});
  const buildState = () => ({ types: seed.types, components: seed.components, cells, summary });

  return (
    <>
      <WorkHeader eyebrow={tab === 'matrix' ? 'Test & Validation Matrix' : 'Build & Test Summary'}
        title={tab === 'matrix' ? 'Track coverage' : 'Build & test summary'}
        desc={tab === 'matrix'
          ? 'A matrix of components against test types. Status reflects the recorded build-and-test results; edit a cell’s script or correct its status here.'
          : 'The build/test outcome the agent records after a run — per-component build status & coverage, business rules verified, and readiness for operations.'}
        right={<>
          <Segmented options={[{ value: 'matrix', label: 'Matrix' }, { value: 'summary', label: 'Summary' }]} value={tab} onChange={setTab} />
          {tab === 'matrix' && <>
            <span className="pill pill-green">{tally.pass || 0} pass</span>
            {tally.fail > 0 && <span className="pill pill-danger">{tally.fail} fail</span>}
          </>}
          {tab === 'summary' && <span className={`pill pill-${summary.readyForOperations ? 'green' : 'amber'}`}>{summary.readyForOperations ? 'ready for ops' : 'not ready'}</span>}
          <Btn kind="primary" icon={I.check} onClick={() => save('tests', buildState())}>Save</Btn>
        </>} />

      {tab === 'summary' && <TestSummary summary={summary} setSummary={setSummary} components={seed.components || []} />}

      <div style={{ flex: 1, minHeight: 0, display: tab === 'matrix' ? 'flex' : 'none' }}>
        {/* matrix */}
        <div className="scroll" style={{ flex: 1, minWidth: 0, padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${(seed.types || []).length}, 1fr)`, gap: 10, minWidth: 480 }}>
            <div></div>
            {(seed.types || []).map(t => <div key={t} className="eyebrow" style={{ textAlign: 'center', paddingBottom: 2 }}>{t}</div>)}
            {(seed.components || []).map((c, ci) => (
              <React.Fragment key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 650 }}>{c.name}</div>
                {(seed.types || []).map((t, ti) => {
                  const k = key(ci, ti); const cell = cells[k] || { status: 'none', code: '' };
                  const s = ST[cell.status] || ST.none; const on = sel === k;
                  return (
                    <button key={k} onClick={() => setSel(k)} style={{
                      borderRadius: 11, border: `1.5px solid ${on ? 'var(--primary)' : s.line}`, cursor: 'pointer',
                      background: on ? 'var(--primary-wash)' : s.bg, padding: '13px 12px', textAlign: 'left', minHeight: 70,
                      display: 'flex', flexDirection: 'column', gap: 7, boxShadow: on ? '0 0 0 3px var(--primary-wash)' : 'none', transition: 'all .14s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flex: '0 0 9px' }}></span>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {cell.code ? cell.code.split('\n')[0].replace(/^(it|test)\(/, '').replace(/['"]/g, '').slice(0, 30) : 'no test'}
                      </div>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
            {Object.entries(ST).map(([k, s]) => (
              <div key={k} className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--ink-faint)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }}></span>{s.label}</div>
            ))}
          </div>
        </div>

        {/* editor */}
        <div style={{ width: 380, flex: '0 0 380px', borderLeft: '1px solid var(--line)', background: 'var(--rail)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rail-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{selT || '—'}</div>
              <div style={{ fontSize: 14, fontWeight: 650 }}>{selC ? selC.name : 'Select a cell'}</div>
            </div>
            <Segmented options={[{ value: 'none', label: '—' }, { value: 'pass', label: 'pass' }, { value: 'fail', label: 'fail' }]}
              value={selCell.status || 'none'} onChange={setStatus} />
          </div>

          {!selCell.code ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center' }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                No <b>{selT || 'test'}</b> script for <b>{selC ? selC.name : 'this cell'}</b> yet.</div>
              <Btn kind="soft" sm icon={I.bolt} onClick={genTemplate} disabled={!selC}>Generate test stub</Btn>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', background: 'var(--surface)', margin: 14, borderRadius: 11, border: '1px solid var(--line)', overflow: 'hidden' }}>
                <div className="mono" aria-hidden style={{ padding: '12px 8px 12px 12px', fontSize: 12, lineHeight: 1.7, color: 'var(--ink-faint)', textAlign: 'right', userSelect: 'none', background: 'var(--surface-2)' }}>
                  {selCell.code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <textarea className="mono scroll" spellCheck={false} value={selCell.code} onChange={e => setCode(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', padding: '12px', fontSize: 12, lineHeight: 1.7, background: 'transparent', color: 'var(--ink)' }} />
              </div>
              <div className="mono" style={{ padding: '0 16px 16px', fontSize: 10.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
                The agent records pass/fail from the real build-and-test run; set it manually above to correct it.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ---- Build & test summary tab ---- */
function TestSummary({ summary, setSummary, components }) {
  const builds = summary.builds || [];
  const brs = summary.businessRulesVerified || [];
  const updBuild = (i, patch) => setSummary({ ...summary, builds: builds.map((b, j) => j === i ? { ...b, ...patch } : b) });
  const fs = { fontSize: 12, padding: '7px 9px' };
  const BUILD = { success: 'green', fail: 'danger', pending: 'amber' };
  return (
    <div className="scroll fadein" style={{ flex: 1, minHeight: 0, padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900 }}>
      {/* build status + coverage */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span className="eyebrow">Build status &amp; coverage</span>
          <button onClick={() => setSummary({ ...summary, builds: [...builds, { component: '', build: 'pending', coverage: 0 }] })} className="mono" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, display: 'flex' }}>{I.plus}</span>add</button>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {builds.length === 0 && <div className="muted" style={{ padding: '12px 14px', fontSize: 12.5 }}>No build results recorded.</div>}
          {builds.map((bd, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <input className="input" value={bd.component} placeholder="component" onChange={e => updBuild(i, { component: e.target.value })} list="tests-comp-list" style={{ ...fs, flex: 1 }} />
              <select className="select" value={bd.build || 'pending'} onChange={e => updBuild(i, { build: e.target.value })} style={{ ...fs, flex: '0 0 120px' }}>
                {['success', 'fail', 'pending'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className={`pill pill-${BUILD[bd.build] || 'neutral'}`} style={{ fontSize: 9 }}>{bd.build || 'pending'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 150px' }}>
                <input className="input mono" type="number" min="0" max="100" value={bd.coverage ?? 0} onChange={e => updBuild(i, { coverage: +e.target.value })} style={{ ...fs, width: 70 }} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>% cov</span>
              </div>
              <button onClick={() => setSummary({ ...summary, builds: builds.filter((_, j) => j !== i) })} style={{ flex: '0 0 22px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>
            </div>
          ))}
        </div>
        <datalist id="tests-comp-list">{components.map(c => <option key={c.id} value={c.name} />)}</datalist>
      </div>

      {/* business rules verified */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span className="eyebrow">Business rules verified</span>
          <button onClick={() => setSummary({ ...summary, businessRulesVerified: [...brs, ''] })} className="mono" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, display: 'flex' }}>{I.plus}</span>add</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {brs.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>None recorded.</div>}
          {brs.map((br, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 15, height: 15, display: 'flex', color: 'var(--green)', flex: '0 0 15px' }}>{I.check}</span>
              <input className="input" value={br} placeholder="BR-XXX-001: …" onChange={e => setSummary({ ...summary, businessRulesVerified: brs.map((x, j) => j === i ? e.target.value : x) })} style={fs} />
              <button onClick={() => setSummary({ ...summary, businessRulesVerified: brs.filter((_, j) => j !== i) })} style={{ flex: '0 0 22px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>
            </div>
          ))}
        </div>
      </div>

      {/* ready for operations */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 500 }}>
        <Switch on={!!summary.readyForOperations} onChange={v => setSummary({ ...summary, readyForOperations: v })} />
        Ready for Operations
        <span className="muted" style={{ fontSize: 12 }}>all builds pass, coverage targets met, business rules verified</span>
      </label>
    </div>
  );
}

window.TestsWS = TestsWS;
