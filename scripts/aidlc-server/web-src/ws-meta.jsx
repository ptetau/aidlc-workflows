/* ws-meta.jsx — read-only reflections of vanilla engine state + the full document set.
   Overview: parsed aidlc-state.md (phase/stage progress + extensions). Documents: every markdown
   artifact under aidlc-docs (outside workspace), rendered with marked. Canonical markdown stays
   canonical; nothing here writes. */
const { useState: mUseState, useEffect: mUseEffect } = React;

const STAGE_STATUS = {
  done: { color: 'var(--green)', pill: 'green', label: 'done' },
  skip: { color: 'var(--ink-faint)', pill: 'neutral', label: 'skipped' },
  pending: { color: 'var(--amber)', pill: 'amber', label: 'pending' },
};

function OverviewWS() {
  const [st, setSt] = mUseState(null);
  const [err, setErr] = mUseState(null);
  mUseEffect(() => {
    fetch('/api/project').then(r => r.json()).then(setSt).catch(e => setErr(String(e)));
  }, []);

  if (err) return <div style={{ padding: 40 }} className="muted">Could not load project state: {err}</div>;
  if (!st) return <div style={{ padding: 40 }} className="muted">Loading…</div>;

  const project = st.project || {};
  const byPhase = {};
  (st.stages || []).forEach(s => { (byPhase[s.phase || 'Other'] = byPhase[s.phase || 'Other'] || []).push(s); });
  const phases = Object.keys(byPhase);

  return (
    <>
      <WorkHeader eyebrow="Overview" title="Workflow state"
        desc="A read-only reflection of aidlc-state.md — where this project is in the AI-DLC lifecycle. The agent drives the workflow; this mirrors it." />
      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900 }}>

        {/* project facts */}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {[['project', project.name || (st.info && st.info['Project Name'])], ['type', st.info && st.info['Project Type']],
            ['current stage', st.info && st.info['Current Stage']], ['doc format', st.format],
            ['repo', project.repo], ['branch', project.branch]].map(([k, v]) => v ? (
            <div key={k}>
              <div className="eyebrow" style={{ marginBottom: 3 }}>{k}</div>
              <div className="mono" style={{ fontSize: 13 }}>{v}</div>
            </div>
          ) : null)}
        </div>

        {!st.hasState && (
          <div className="card" style={{ padding: '14px 16px', borderColor: 'var(--amber-line)' }}>
            <span className="muted" style={{ fontSize: 13 }}>No <code>aidlc-state.md</code> found — run <code>/aidlc</code> to start the workflow, or this isn't an aidlc project yet.</span>
          </div>
        )}

        {/* stage progress by phase */}
        {phases.map(phase => (
          <div key={phase}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{phase}</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {byPhase[phase].map((s, i) => {
                const ss = STAGE_STATUS[s.status] || STAGE_STATUS.pending;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 15px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ width: 16, height: 16, display: 'flex', color: ss.color, flex: '0 0 16px' }}>
                      {s.status === 'done' ? I.check : s.status === 'skip' ? I.x : I.chevR}
                    </span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: s.status === 'skip' ? 'var(--ink-faint)' : 'var(--ink)' }}>{s.name}</span>
                    <span className={`pill pill-${ss.pill}`} style={{ fontSize: 9.5 }}>{ss.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* extensions */}
        {(st.extensions || []).length > 0 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Extensions</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {st.extensions.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 15px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{e.name}</span>
                  {e.decidedAt && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{e.decidedAt}</span>}
                  <span className={`pill pill-${e.enabled ? 'green' : 'neutral'}`} style={{ fontSize: 9.5 }}>{e.enabled ? 'enabled' : 'off'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DocumentsWS() {
  const [docs, setDocs] = mUseState(null);
  const [sel, setSel] = mUseState(null);
  const [body, setBody] = mUseState('');
  const [loading, setLoading] = mUseState(false);

  mUseEffect(() => { fetch('/api/docs').then(r => r.json()).then(setDocs).catch(() => setDocs([])); }, []);
  mUseEffect(() => {
    if (!sel) return;
    setLoading(true);
    fetch('/api/doc?path=' + encodeURIComponent(sel)).then(r => r.text())
      .then(t => { setBody(t); setLoading(false); }).catch(() => { setBody('*(could not load)*'); setLoading(false); });
  }, [sel]);

  const groups = {};
  (docs || []).forEach(d => { (groups[d.dir] = groups[d.dir] || []).push(d); });
  const dirs = Object.keys(groups).sort();
  const rendered = window.marked ? window.marked.parse(body || '') : ('<pre>' + (body || '') + '</pre>');

  return (
    <>
      <WorkHeader eyebrow="Documents" title="All artifacts"
        desc="Every markdown artifact under aidlc-docs/ — reverse-engineering, functional & NFR design, plans, code summaries, audit, state. Read-only here; the six rich workspaces are edited under their own tabs." />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* file list */}
        <div className="scroll" style={{ width: 300, flex: '0 0 300px', borderRight: '1px solid var(--line)', background: 'var(--rail)', padding: '14px 12px' }}>
          {docs === null && <div className="muted" style={{ padding: 10, fontSize: 12.5 }}>Loading…</div>}
          {docs && docs.length === 0 && <div className="muted" style={{ padding: 10, fontSize: 12.5 }}>No markdown artifacts found.</div>}
          {dirs.map(dir => (
            <div key={dir} style={{ marginBottom: 12 }}>
              <div className="eyebrow" style={{ padding: '2px 8px 6px' }}>{dir === '.' ? 'root' : dir}</div>
              {groups[dir].map(d => {
                const on = sel === d.path;
                return (
                  <button key={d.path} onClick={() => setSel(d.path)} style={{
                    display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    borderRadius: 8, padding: '7px 9px', font: 'inherit', fontSize: 12.5, marginBottom: 1,
                    background: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--ink)' : 'var(--ink-soft)',
                    fontWeight: on ? 650 : 500, boxShadow: on ? 'var(--shadow-sm)' : 'none',
                  }}>{d.title}<div className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.path.split('/').pop()}</div></button>
                );
              })}
            </div>
          ))}
        </div>
        {/* rendered doc */}
        <div className="scroll" style={{ flex: 1, minWidth: 0, padding: '24px 32px' }}>
          {!sel && <div className="muted" style={{ padding: '60px 10px', textAlign: 'center', fontSize: 13.5 }}>Select a document to read it.</div>}
          {sel && loading && <div className="muted">Loading…</div>}
          {sel && !loading && <div className="doc-md" dangerouslySetInnerHTML={{ __html: rendered }} />}
        </div>
      </div>
    </>
  );
}

window.OverviewWS = OverviewWS;
window.DocumentsWS = DocumentsWS;
