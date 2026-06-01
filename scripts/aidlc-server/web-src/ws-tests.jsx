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
  const buildState = () => ({ types: seed.types, components: seed.components, cells });

  return (
    <>
      <WorkHeader eyebrow="Test & Validation Matrix" title="Track coverage"
        desc="A matrix of components against test types. Status reflects the recorded build-and-test results; edit a cell's script or correct its status here."
        right={<>
          <span className="pill pill-green">{tally.pass || 0} pass</span>
          {tally.fail > 0 && <span className="pill pill-danger">{tally.fail} fail</span>}
          <Btn kind="primary" icon={I.check} onClick={() => save('tests', buildState())}>Save</Btn>
        </>} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
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

window.TestsWS = TestsWS;
