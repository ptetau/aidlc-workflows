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
  const [plans, setPlans] = mUseState([]);
  const [gateNote, setGateNote] = mUseState('');
  const push = useToast();
  mUseEffect(() => {
    fetch('/api/project').then(r => r.json()).then(setSt).catch(e => setErr(String(e)));
    fetch('/api/plans').then(r => r.json()).then(d => Array.isArray(d) && setPlans(d)).catch(() => {});
  }, []);

  const decide = (stage, decision) => {
    fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'gate', stage, decision, note: gateNote }) })
      .then(r => { if (!r.ok) throw 0; setGateNote('');
        push(<><span className="tdot"></span><span>Recorded <b>{decision}</b> — run <code>/aidlc ingest</code> for aidlc to act</span></>);
        window.dispatchEvent(new CustomEvent('aidlc-saved', { detail: { id: 'gate' } })); })
      .catch(() => push(<><span className="tdot" style={{ background: 'var(--danger)' }}></span><span>Could not record decision</span></>));
  };

  if (err) return <div style={{ padding: 40 }} className="muted">Could not load project state: {err}</div>;
  if (!st) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  const currentStage = (st.info && st.info['Current Stage']) || '';

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

        {/* approval gate — records a decision the agent consumes via /aidlc ingest */}
        {st.hasState && currentStage && (
          <div className="card" style={{ padding: '16px 18px' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Approval gate · {currentStage}</div>
            <p className="softline" style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.5 }}>
              Record your decision for the current stage. It’s logged to the digest; run <code>/aidlc ingest</code> and the agent proceeds or revises accordingly — the server doesn’t drive the workflow.
            </p>
            <textarea className="textarea" rows={2} placeholder="Optional note (what to change, why approving…)" value={gateNote}
              onChange={e => setGateNote(e.target.value)} style={{ fontSize: 12.5, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 9 }}>
              <Btn kind="green" icon={I.check} onClick={() => decide(currentStage, 'approve')}>Approve &amp; continue</Btn>
              <Btn kind="ghost" icon={I.edit} onClick={() => decide(currentStage, 'changes')}>Request changes</Btn>
            </div>
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

        {/* plan progress (reflects [ ]/[x] in plans/*.md — the markdown execution engine) */}
        {plans.length > 0 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Plans · checkbox progress</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {plans.map((p, i) => {
                const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 15px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.path}>{p.title}</span>
                    <div style={{ flex: '0 0 140px', height: 6, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ width: pct + '%', height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--primary)' }}></div>
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', flex: '0 0 56px', textAlign: 'right' }}>{p.done}/{p.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
  const [editing, setEditing] = mUseState(false);
  const [draft, setDraft] = mUseState('');
  const push = useToast();

  mUseEffect(() => { fetch('/api/docs').then(r => r.json()).then(setDocs).catch(() => setDocs([])); }, []);
  mUseEffect(() => {
    if (!sel) return;
    setEditing(false); setLoading(true);
    fetch('/api/doc?path=' + encodeURIComponent(sel)).then(r => r.text())
      .then(t => { setBody(t); setLoading(false); }).catch(() => { setBody('*(could not load)*'); setLoading(false); });
  }, [sel]);

  const selDoc = (docs || []).find(d => d.path === sel);
  const saveDoc = () => {
    fetch('/api/doc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: sel, content: draft }) })
      .then(r => { if (!r.ok) throw 0; setBody(draft); setEditing(false);
        push(<><span className="tdot"></span><span>Saved <b>{sel}</b> — recorded for the next <code>/aidlc ingest</code></span></>);
        window.dispatchEvent(new CustomEvent('aidlc-saved', { detail: { id: sel } })); })
      .catch(() => push(<><span className="tdot" style={{ background: 'var(--danger)' }}></span><span>Save failed</span></>));
  };

  const groups = {};
  (docs || []).forEach(d => { (groups[d.dir] = groups[d.dir] || []).push(d); });
  const dirs = Object.keys(groups).sort();
  const rendered = window.marked ? window.marked.parse(body || '') : ('<pre>' + (body || '') + '</pre>');

  return (
    <>
      <WorkHeader eyebrow="Documents" title="All artifacts"
        desc="Every markdown artifact under aidlc-docs/ — reverse-engineering, functional & NFR design, plans, code summaries, audit, state. Editable (except engine-owned state/plans/audit); the six rich workspaces have their own tabs." />
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
        {/* rendered / editable doc */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {sel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
              <span className="mono" style={{ flex: 1, fontSize: 11, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel}</span>
              {!editing && selDoc && selDoc.editable && <Btn kind="soft" sm icon={I.edit} onClick={() => { setDraft(body); setEditing(true); }}>Edit</Btn>}
              {!editing && selDoc && !selDoc.editable && <span className="pill pill-neutral" style={{ fontSize: 9.5 }}>read-only · engine-owned</span>}
              {editing && <>
                <Btn kind="ghost" sm onClick={() => setEditing(false)}>Cancel</Btn>
                <Btn kind="primary" sm icon={I.check} onClick={saveDoc}>Save</Btn>
              </>}
            </div>
          )}
          <div className="scroll" style={{ flex: 1, minHeight: 0, padding: editing ? 0 : '24px 32px' }}>
            {!sel && <div className="muted" style={{ padding: '60px 10px', textAlign: 'center', fontSize: 13.5 }}>Select a document.</div>}
            {sel && loading && <div className="muted" style={{ padding: 24 }}>Loading…</div>}
            {sel && !loading && !editing && <div className="doc-md" dangerouslySetInnerHTML={{ __html: rendered }} />}
            {sel && !loading && editing && (
              <textarea className="mono" spellCheck={false} value={draft} onChange={e => setDraft(e.target.value)}
                style={{ width: '100%', height: '100%', minHeight: 400, border: 'none', outline: 'none', resize: 'none', padding: '20px 32px', fontSize: 12.5, lineHeight: 1.7, background: 'var(--surface)', color: 'var(--ink)' }} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Audit view (verbatim trail) ---------------- */
function AuditWS() {
  const [body, setBody] = mUseState(null);
  mUseEffect(() => {
    fetch('/api/doc?path=' + encodeURIComponent('audit.md'))
      .then(r => r.ok ? r.text() : null).then(setBody).catch(() => setBody(null));
  }, []);
  const rendered = (body && window.marked) ? window.marked.parse(body) : '';
  return (
    <>
      <WorkHeader eyebrow="Audit" title="The trail"
        desc="The verbatim, append-only audit log (aidlc-docs/audit.md) — every interaction and decision, recorded by the agent. Distinct from the Digest, which is the editable change-conversation." />
      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: '24px 32px' }}>
        {body === null && <div className="muted" style={{ fontSize: 13.5 }}>No <code>audit.md</code> yet — it’s written as the workflow runs.</div>}
        {body !== null && <div className="doc-md" dangerouslySetInnerHTML={{ __html: rendered }} />}
      </div>
    </>
  );
}

window.OverviewWS = OverviewWS;
window.DocumentsWS = DocumentsWS;
window.AuditWS = AuditWS;
