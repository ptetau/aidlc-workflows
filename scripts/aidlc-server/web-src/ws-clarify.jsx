/* ws-clarify.jsx — Clarification Workspace: split-pane review.
   Left: requirement w/ clickable ambiguities. Middle: AI question forms.
   Right: sticky global notes. Header: progress + copy to json. */
const { useState: cUseState, useRef: cUseRef, useEffect: cUseEffect } = React;

function isAnswered(q, a) {
  if (q.kind === 'radio') return a !== null && a !== undefined;
  if (q.kind === 'multi') return Array.isArray(a) && a.length > 0;
  return typeof a === 'string' && a.trim().length > 0;
}
function answerText(q, a) {
  if (!isAnswered(q, a)) return null;
  if (q.kind === 'radio') return q.options[a];
  if (q.kind === 'multi') return a.map(i => q.options[i]);
  return a;
}

function ClarifyWS() {
  const seed = window.SEED.clarify;
  const save = useSave();
  const [answers, setAnswers] = cUseState(() => Object.fromEntries(seed.questions.map(q => [q.id, q.answer])));
  const [notes, setNotes] = cUseState(seed.notes);
  const [draft, setDraft] = cUseState('');
  const [focusQ, setFocusQ] = cUseState(null);
  const [hoverQ, setHoverQ] = cUseState(null);
  const cardRefs = cUseRef({});
  // P1: the structured requirements document (FR / NFR / decisions / scope)
  const [tab, setTab] = cUseState('clarify');
  usePendingNav(setTab); // arrive from a traceability link → switch to the right tab + scroll
  const [functional, setFunctional] = cUseState(() => seed.functional || []);
  const [nfrs, setNfrs] = cUseState(() => seed.nfrs || []);
  const [decisions, setDecisions] = cUseState(() => seed.decisions || []);
  const [scope, setScope] = cUseState(() => seed.scope || { in: [], out: [] });

  const answeredCount = seed.questions.filter(q => isAnswered(q, answers[q.id])).length;

  const focusQuestion = (id) => {
    setFocusQ(id);
    const el = cardRefs.current[id];
    if (el) el.scrollTo ? null : null;
    if (el && el.scrollIntoViewIfNeeded) el.scrollIntoViewIfNeeded();
    else if (el) { const p = el.closest('.scroll'); if (p) p.scrollTop = el.offsetTop - p.offsetTop - 12; }
    setTimeout(() => setFocusQ(f => f === id ? null : f), 1400);
  };

  // editable state in SEED shape — what gets persisted to workspace/clarify.json
  const buildState = () => ({
    requirement: seed.requirement,
    questions: seed.questions.map(q => ({ ...q, answer: answers[q.id] })),
    notes,
    functional, nfrs, decisions, scope,
  });

  return (
    <>
      <WorkHeader
        eyebrow="Clarification Workspace"
        title={tab === 'clarify' ? 'Resolve the ambiguities' : 'Requirements'}
        desc={tab === 'clarify'
          ? 'The AI flagged unclear language in the requirement. Answer each question to lock down scope before stories are generated.'
          : 'The structured requirements that result from clarification — functional, non-functional, decisions and scope.'}
        right={<>
          <Segmented options={[{ value: 'clarify', label: 'Clarify' }, { value: 'requirements', label: 'Requirements' }]} value={tab} onChange={setTab} />
          {tab === 'clarify' && <span className="pill pill-clay">{answeredCount} / {seed.questions.length} answered</span>}
          <Btn kind="primary" icon={I.check} onClick={() => save('clarify', buildState())}>Save</Btn>
        </>}
      />

      {tab === 'requirements' && (
        <ClarifyRequirements functional={functional} setFunctional={setFunctional}
          nfrs={nfrs} setNfrs={setNfrs} decisions={decisions} setDecisions={setDecisions}
          scope={scope} setScope={setScope} />
      )}

      <div style={{ flex: 1, minHeight: 0, display: tab === 'clarify' ? 'flex' : 'none', overflowX: 'auto' }}>
        {/* requirement pane */}
        <div style={{ width: 330, flex: '0 1 330px', minWidth: 264, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 22px 10px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 16 }}>Original requirement</h2>
            <span className="pill pill-danger">{seed.questions.length} flags</span>
          </div>
          <div className="scroll" style={{ padding: '4px 22px 24px', flex: 1 }}>
            <p style={{ fontSize: 14.5, lineHeight: 1.9, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {seed.requirement.map((seg, i) => {
                if (!seg.amb) return <span key={i}>{seg.t}</span>;
                const done = isAnswered(seed.questions.find(q => q.id === seg.amb), answers[seg.amb]);
                const isFocus = focusQ === seg.amb || hoverQ === seg.amb;
                return (
                  <mark key={i} onClick={() => focusQuestion(seg.amb)}
                    onMouseEnter={() => setHoverQ(seg.amb)} onMouseLeave={() => setHoverQ(null)}
                    style={{
                      cursor: 'pointer', borderRadius: 4, padding: '1px 4px', fontWeight: 500,
                      color: done ? 'var(--green-deep)' : 'var(--primary-deep)',
                      background: done ? 'var(--green-wash)' : 'var(--primary-wash)',
                      borderBottom: `2px solid ${done ? 'var(--green)' : 'var(--primary)'}`,
                      boxShadow: isFocus ? `0 0 0 3px ${done ? 'var(--green-line)' : 'var(--primary-line)'}` : 'none',
                      transition: 'box-shadow .15s, background .2s, color .2s',
                    }}>
                    {seg.t}
                  </mark>
                );
              })}
            </p>
            <div style={{ marginTop: 22, padding: 14, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>How to read this</div>
              <p className="softline" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55 }}>
                Underlined phrases are ambiguities. Click one to jump to its question. They turn <span style={{ color: 'var(--green-deep)', fontWeight: 600 }}>green</span> once resolved.
              </p>
            </div>
          </div>
        </div>

        {/* questions pane */}
        <div style={{ flex: 1, minWidth: 360, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px 10px' }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 16 }}>AI clarifications</h2>
          </div>
          <div className="scroll" style={{ padding: '4px 24px 28px', flex: 1 }}>
            {seed.questions.map(q => {
              const a = answers[q.id];
              const done = isAnswered(q, a);
              const focused = focusQ === q.id;
              return (
                <div key={q.id} ref={el => cardRefs.current[q.id] = el}
                  onMouseEnter={() => setHoverQ(q.id)} onMouseLeave={() => setHoverQ(null)}
                  className="card" style={{
                    padding: '16px 18px', marginBottom: 14, position: 'relative',
                    borderColor: focused ? 'var(--primary)' : (done ? 'var(--green-line)' : 'var(--line)'),
                    boxShadow: focused ? '0 0 0 3px var(--primary-wash), var(--shadow)' : 'var(--shadow)',
                    transition: 'box-shadow .2s, border-color .2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                      color: done ? 'var(--green-deep)' : 'var(--primary-deep)', textTransform: 'uppercase' }}>
                      {q.n} · {q.topic}
                    </span>
                    {done && <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--green)' }}>{I.check}</span>}
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, marginBottom: 13 }}>{q.text}</div>

                  {q.kind === 'radio' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map((opt, i) => <OptRow key={i} sel={a === i} radio onClick={() => setAnswers(s => ({ ...s, [q.id]: i }))}>{opt}</OptRow>)}
                    </div>
                  )}
                  {q.kind === 'multi' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map((opt, i) => {
                        const sel = Array.isArray(a) && a.includes(i);
                        return <OptRow key={i} sel={sel} onClick={() => setAnswers(s => {
                          const cur = Array.isArray(s[q.id]) ? s[q.id] : [];
                          return { ...s, [q.id]: sel ? cur.filter(x => x !== i) : [...cur, i].sort() };
                        })}>{opt}</OptRow>;
                      })}
                    </div>
                  )}
                  {q.kind === 'text' && (
                    <textarea className="textarea mono" rows={2} placeholder={q.placeholder}
                      style={{ fontSize: 12.5 }} value={a || ''} onChange={e => setAnswers(s => ({ ...s, [q.id]: e.target.value }))} />
                  )}

                  {q.suggest && (
                    <div style={{ marginTop: 11 }}>
                      <button onClick={() => {
                        if (q.kind === 'text') setAnswers(s => ({ ...s, [q.id]: q.suggest.value }));
                        else if (q.kind === 'multi') setAnswers(s => ({ ...s, [q.id]: q.suggest.value }));
                        else setAnswers(s => ({ ...s, [q.id]: q.options.indexOf(q.suggest.value) }));
                      }} className="mono" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600,
                        padding: '6px 11px', borderRadius: 8, cursor: 'pointer',
                        border: '1px dashed var(--primary-line)', color: 'var(--primary-deep)', background: 'transparent',
                      }}>
                        <span style={{ width: 13, height: 13, display: 'flex' }}>{I.plus}</span>
                        suggested context
                        <span style={{ opacity: .6, fontWeight: 400 }}>· {q.suggest.label}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* notes sidebar */}
        <div style={{ width: 248, flex: '0 0 248px', borderLeft: '1px solid var(--line)', background: 'var(--rail)',
          display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '17px 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 15, height: 15, display: 'flex', color: 'var(--ink-faint)' }}>{I.note}</span>
            <span className="eyebrow">Global notes</span>
          </div>
          <div className="scroll" style={{ flex: 1, padding: '4px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map(n => (
              <div key={n.id} style={{ background: 'var(--note)', borderRadius: 11, padding: '11px 12px',
                boxShadow: 'var(--shadow-sm)', position: 'relative', border: '1px solid var(--note-line)' }}>
                <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--note-ink)', opacity: .8, marginBottom: 5, letterSpacing: '.03em' }}>{n.kind}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--note-ink)' }}>{n.text}</div>
                <button onClick={() => setNotes(ns => ns.filter(x => x.id !== n.id))} title="Delete note" style={{
                  position: 'absolute', top: 7, right: 7, width: 20, height: 20, border: 'none', cursor: 'pointer',
                  borderRadius: 6, background: 'transparent', color: 'var(--note-ink)', opacity: .5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span>
                </button>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px 16px', borderTop: '1px solid var(--rail-line)' }}>
            <textarea className="textarea" rows={2} placeholder="Add a global constraint or note…" value={draft}
              onChange={e => setDraft(e.target.value)} style={{ fontSize: 12.5, background: 'var(--surface)' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { addNote(); } }} />
            <Btn kind="soft" sm icon={I.plus} onClick={addNote} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>Add note</Btn>
          </div>
        </div>
      </div>
    </>
  );

  function addNote() {
    if (!draft.trim()) return;
    setNotes(ns => [...ns, { id: 'n' + Date.now(), kind: 'PRIYA · now', text: draft.trim() }]);
    setDraft('');
  }
}

function OptRow({ sel, radio, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 9, width: '100%',
      textAlign: 'left', font: 'inherit', fontSize: 13, cursor: 'pointer',
      border: `1px solid ${sel ? 'var(--primary)' : 'var(--line)'}`,
      background: sel ? 'var(--primary-wash)' : 'var(--surface-2)',
      color: 'var(--ink)', transition: 'border-color .14s, background .14s',
    }}>
      <span style={{
        width: 17, height: 17, flex: '0 0 17px', borderRadius: radio ? '50%' : 5,
        border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--line-2)'}`,
        background: sel && !radio ? 'var(--primary)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {sel && radio && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}></span>}
        {sel && !radio && <span style={{ width: 11, height: 11, display: 'flex', color: '#fff' }}>{I.check}</span>}
      </span>
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  );
}

/* ---- Requirements tab: editable FR / NFR / decisions / scope ---- */
function ClarifyRequirements({ functional, setFunctional, nfrs, setNfrs, decisions, setDecisions, scope, setScope }) {
  const upd = (arr, set, i, patch) => set(arr.map((x, j) => j === i ? { ...x, ...patch } : x));
  const del = (arr, set, i) => set(arr.filter((_, j) => j !== i));
  const fieldStyle = { fontSize: 12.5, padding: '7px 9px' };

  return (
    <div className="scroll fadein" style={{ flex: 1, minHeight: 0, padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900 }}>
      {/* Functional requirements */}
      <Section title="Functional requirements" onAdd={() => setFunctional([...functional, { id: 'FR-' + String(functional.length + 1).padStart(3, '0'), text: '' }])}>
        {functional.length === 0 && <Empty>No functional requirements yet.</Empty>}
        {functional.map((f, i) => (
          <div key={i} data-anchor={f.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input className="input mono" value={f.id} onChange={e => upd(functional, setFunctional, i, { id: e.target.value })} style={{ ...fieldStyle, flex: '0 0 110px' }} />
            <textarea className="textarea" rows={1} value={f.text} placeholder="The system must…" onChange={e => upd(functional, setFunctional, i, { text: e.target.value })} style={{ ...fieldStyle, flex: 1 }} />
            <DelBtn onClick={() => del(functional, setFunctional, i)} />
          </div>
        ))}
      </Section>

      {/* Non-functional */}
      <Section title="Non-functional requirements" onAdd={() => setNfrs([...nfrs, { category: '', requirement: '', target: '' }])}>
        {nfrs.length === 0 && <Empty>No NFRs yet.</Empty>}
        {nfrs.length > 0 && (
          <div className="eyebrow" style={{ display: 'flex', gap: 8, padding: '0 2px' }}>
            <span style={{ flex: '0 0 130px' }}>category</span><span style={{ flex: 1 }}>requirement</span><span style={{ flex: '0 0 150px' }}>target</span><span style={{ width: 24 }}></span>
          </div>
        )}
        {nfrs.map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input className="input" value={n.category} placeholder="Performance" onChange={e => upd(nfrs, setNfrs, i, { category: e.target.value })} style={{ ...fieldStyle, flex: '0 0 130px' }} />
            <input className="input" value={n.requirement} placeholder="p99 latency" onChange={e => upd(nfrs, setNfrs, i, { requirement: e.target.value })} style={{ ...fieldStyle, flex: 1 }} />
            <input className="input mono" value={n.target} placeholder="< 200ms" onChange={e => upd(nfrs, setNfrs, i, { target: e.target.value })} style={{ ...fieldStyle, flex: '0 0 150px' }} />
            <DelBtn onClick={() => del(nfrs, setNfrs, i)} />
          </div>
        ))}
      </Section>

      {/* Architectural decisions */}
      <Section title="Architectural decisions" onAdd={() => setDecisions([...decisions, { decision: '', choice: '', rationale: '' }])}>
        {decisions.length === 0 && <Empty>No decisions recorded.</Empty>}
        {decisions.map((d, i) => (
          <div key={i} className="card" style={{ padding: 11, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={d.decision} placeholder="Decision" onChange={e => upd(decisions, setDecisions, i, { decision: e.target.value })} style={{ ...fieldStyle, flex: 1, fontWeight: 600 }} />
              <input className="input" value={d.choice} placeholder="Choice" onChange={e => upd(decisions, setDecisions, i, { choice: e.target.value })} style={{ ...fieldStyle, flex: 1 }} />
              <DelBtn onClick={() => del(decisions, setDecisions, i)} />
            </div>
            <textarea className="textarea" rows={1} value={d.rationale} placeholder="Rationale…" onChange={e => upd(decisions, setDecisions, i, { rationale: e.target.value })} style={fieldStyle} />
          </div>
        ))}
      </Section>

      {/* Scope */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>MVP scope</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[['in', 'In scope', 'green'], ['out', 'Out of scope', 'neutral']].map(([key, label, pill]) => (
            <div key={key} className="card" style={{ flex: '1 1 320px', padding: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 9 }}>
                <span className={`pill pill-${pill}`} style={{ fontSize: 9.5 }}>{label}</span>
                <button onClick={() => setScope({ ...scope, [key]: [...(scope[key] || []), ''] })} className="mono" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, display: 'flex' }}>{I.plus}</span>add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(scope[key] || []).length === 0 && <Empty>Nothing yet.</Empty>}
                {(scope[key] || []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <input className="input" value={s} onChange={e => setScope({ ...scope, [key]: scope[key].map((x, j) => j === i ? e.target.value : x) })} style={fieldStyle} />
                    <DelBtn onClick={() => setScope({ ...scope, [key]: scope[key].filter((_, j) => j !== i) })} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, onAdd, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <span className="eyebrow">{title}</span>
        {onAdd && <button onClick={onAdd} className="mono" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, display: 'flex' }}>{I.plus}</span>add</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}
function Empty({ children }) { return <div className="muted" style={{ fontSize: 12.5, padding: '4px 2px' }}>{children}</div>; }
function DelBtn({ onClick }) {
  return <button onClick={onClick} title="Remove" style={{ flex: '0 0 24px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', width: 24, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>;
}

window.ClarifyWS = ClarifyWS;
