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
  });

  return (
    <>
      <WorkHeader
        eyebrow="Clarification Workspace"
        title="Resolve the ambiguities"
        desc="The AI flagged unclear language in the requirement. Answer each question to lock down scope before stories are generated."
        right={<>
          <span className="pill pill-clay">{answeredCount} / {seed.questions.length} answered</span>
          <Btn kind="ghost" sm icon={I.reset} onClick={() => setAnswers(Object.fromEntries(seed.questions.map(q => [q.id, q.kind === 'multi' ? [] : null])))}>Reset</Btn>
          <Btn kind="primary" icon={I.check} onClick={() => save('clarify', buildState())}>Save</Btn>
        </>}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto' }}>
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

window.ClarifyWS = ClarifyWS;
