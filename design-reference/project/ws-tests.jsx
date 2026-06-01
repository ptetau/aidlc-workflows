/* ws-tests.jsx — Test & Validation Runner.
   Matrix grid (components × test types). Select a cell to edit its script in a
   mini-IDE, hit Run to simulate execution with pass/fail + stack traces. */
const { useState: tUseState, useRef: tUseRef } = React;

const ST = {
  pass: { color: 'var(--green)', bg: 'var(--green-wash)', line: 'var(--green-line)', label: 'pass' },
  fail: { color: 'var(--danger)', bg: 'var(--danger-wash)', line: 'var(--danger)', label: 'fail' },
  running: { color: 'var(--amber)', bg: 'var(--amber-wash)', line: 'var(--amber-line)', label: 'run' },
  none: { color: 'var(--ink-faint)', bg: 'var(--surface-2)', line: 'var(--line)', label: '—' },
};
const willFail = code => /\/\/ got|retried after success/.test(code);

function TestsWS() {
  const seed = window.SEED.tests;
  const copyJSON = useCopyJSON();
  const [cells, setCells] = tUseState(() => JSON.parse(JSON.stringify(seed.cells)));
  const [sel, setSel] = tUseState('inv-1');
  const [running, setRunning] = tUseState({});
  const timers = tUseRef([]);

  const key = (ci, ti) => `${seed.components[ci].id}-${ti}`;
  const selCell = cells[sel];
  const [selC, selT] = (() => { const [cid, t] = sel.split('-'); return [seed.components.find(c => c.id === cid), seed.types[+t]]; })();

  const runCell = (k) => new Promise(res => {
    if (!cells[k] || !cells[k].code) return res();
    setRunning(r => ({ ...r, [k]: true }));
    const t = setTimeout(() => {
      setRunning(r => { const c = { ...r }; delete c[k]; return c; });
      setCells(cs => ({ ...cs, [k]: { ...cs[k], status: willFail(cs[k].code) ? 'fail' : 'pass' } }));
      res();
    }, 520 + Math.random() * 480);
    timers.current.push(t);
  });

  const runAll = async () => { for (const k of Object.keys(cells)) { if (cells[k].code) await runCell(k); } };
  const setCode = code => setCells(cs => ({ ...cs, [sel]: { ...cs[sel], code } }));
  const genTemplate = () => setCells(cs => ({ ...cs, [sel]: { status: 'none', code: `it('${selC.name.toLowerCase()} · ${selT.toLowerCase()}', () => {\n  // arrange\n  // act\n  // assert\n  expect(true).toBe(true)\n})` } }));

  const tally = Object.values(cells).reduce((a, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {});

  const payload = () => ({
    project: window.SEED.project, document: 'tests', generatedAt: new Date().toISOString(),
    environment: { runner: 'vitest', node: '20', browser: 'playwright/chromium', ci: true },
    summary: { passed: tally.pass || 0, failed: tally.fail || 0, missing: tally.none || 0 },
    suites: seed.components.map(c => ({
      component: c.name,
      tests: seed.types.map((t, ti) => { const cell = cells[`${c.id}-${ti}`]; return { type: t, status: cell.status, hasScript: !!cell.code, script: cell.code || null }; }),
    })),
  });

  return (
    <>
      <WorkHeader eyebrow="Test & Validation Runner" title="Prove it works"
        desc="A matrix of components against test types. Edit any cell's script, then run it to simulate execution with pass/fail results."
        right={<>
          <span className="pill pill-green">{tally.pass || 0} pass</span>
          {tally.fail > 0 && <span className="pill pill-danger">{tally.fail} fail</span>}
          <Btn kind="soft" sm icon={I.play} onClick={runAll}>Run all</Btn>
          <Btn kind="primary" icon={I.copy} onClick={() => copyJSON(payload(), 'test suites')}>copy to json</Btn>
        </>} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* matrix */}
        <div className="scroll" style={{ flex: 1, minWidth: 0, padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${seed.types.length}, 1fr)`, gap: 10, minWidth: 480 }}>
            <div></div>
            {seed.types.map(t => <div key={t} className="eyebrow" style={{ textAlign: 'center', paddingBottom: 2 }}>{t}</div>)}
            {seed.components.map((c, ci) => (
              <React.Fragment key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 650 }}>{c.name}</div>
                {seed.types.map((t, ti) => {
                  const k = key(ci, ti); const cell = cells[k]; const isRun = running[k];
                  const status = isRun ? 'running' : cell.status; const s = ST[status]; const on = sel === k;
                  return (
                    <button key={k} onClick={() => setSel(k)} style={{
                      borderRadius: 11, border: `1.5px solid ${on ? 'var(--primary)' : s.line}`, cursor: 'pointer',
                      background: on ? 'var(--primary-wash)' : s.bg, padding: '13px 12px', textAlign: 'left', minHeight: 70,
                      display: 'flex', flexDirection: 'column', gap: 7, boxShadow: on ? '0 0 0 3px var(--primary-wash)' : 'none', transition: 'all .14s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flex: '0 0 9px',
                          animation: isRun ? 'pulse 1s infinite' : 'none' }}></span>
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
            {Object.entries(ST).filter(([k]) => k !== 'running').map(([k, s]) => (
              <div key={k} className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--ink-faint)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }}></span>{s.label}</div>
            ))}
          </div>
        </div>

        {/* editor / runner */}
        <div style={{ width: 380, flex: '0 0 380px', borderLeft: '1px solid var(--line)', background: 'var(--rail)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rail-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{selT}</div>
              <div style={{ fontSize: 14, fontWeight: 650 }}>{selC.name}</div>
            </div>
            <Btn kind="green" sm icon={I.play} onClick={() => runCell(sel)} disabled={!selCell.code || running[sel]}>
              {running[sel] ? 'Running…' : 'Run'}</Btn>
          </div>

          {!selCell.code ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center' }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>No <b>{selT}</b> test for <b>{selC.name}</b> yet.</div>
              <Btn kind="soft" sm icon={I.bolt} onClick={genTemplate}>Generate test stub</Btn>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* mini-IDE */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', background: 'var(--surface)', margin: 14, borderRadius: 11, border: '1px solid var(--line)', overflow: 'hidden' }}>
                <div className="mono" aria-hidden style={{ padding: '12px 8px 12px 12px', fontSize: 12, lineHeight: 1.7, color: 'var(--ink-faint)', textAlign: 'right', userSelect: 'none', background: 'var(--surface-2)' }}>
                  {selCell.code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <textarea className="mono scroll" spellCheck={false} value={selCell.code} onChange={e => setCode(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', padding: '12px', fontSize: 12, lineHeight: 1.7,
                    background: 'transparent', color: 'var(--ink)' }} />
              </div>
              {/* result */}
              <ResultPanel cell={selCell} comp={selC} running={running[sel]} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ResultPanel({ cell, comp, running }) {
  const [open, setOpen] = tUseState(true);
  if (running) return <div style={{ padding: '14px 16px', borderTop: '1px solid var(--rail-line)' }} className="mono">
    <span style={{ color: 'var(--amber)', fontSize: 12 }}>● running test…</span></div>;
  if (cell.status === 'none') return <div style={{ padding: '14px 16px', borderTop: '1px solid var(--rail-line)', fontSize: 12 }} className="mono muted">Not run yet. Hit Run.</div>;
  const pass = cell.status === 'pass';
  return (
    <div style={{ borderTop: '1px solid var(--rail-line)', padding: '12px 16px 16px', maxHeight: 220, overflow: 'auto' }} className="scroll">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 16, height: 16, display: 'flex', color: pass ? 'var(--green)' : 'var(--danger)' }}>{pass ? I.check : I.x}</span>
        <span style={{ fontSize: 13, fontWeight: 650, color: pass ? 'var(--green-deep)' : 'var(--danger)' }}>{pass ? 'Test passed' : 'Test failed'}</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--ink-faint)' }}>{(0.2 + Math.random() * 1.4).toFixed(2)}s</span>
      </div>
      {!pass && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setOpen(o => !o)} className="mono" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
            <span style={{ width: 12, height: 12, display: 'flex', transform: open ? 'rotate(90deg)' : 'none' }}>{I.chevR}</span>stack trace</button>
          {open && (
            <pre className="mono" style={{ margin: '8px 0 0', fontSize: 10.5, lineHeight: 1.6, background: 'var(--danger-wash)', border: '1px solid var(--danger)', borderRadius: 9, padding: 11, color: 'var(--danger)', whiteSpace: 'pre-wrap' }}>
{`AssertionError: expected 1 but got 2
  at ${comp.name.replace(/\s/g, '')}.test.ts:4:18
  at runTest (vitest/runner.ts:212)
  at processTicksAndRejections (node:internal)`}
            </pre>
          )}
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 8 }}>Tip: fix the assertion or remove the <code>// got</code> marker, then re-run.</div>
        </div>
      )}
    </div>
  );
}

window.TestsWS = TestsWS;
