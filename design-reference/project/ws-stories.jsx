/* ws-stories.jsx — Story & Requirements Board.
   Epic tree (filter) + Kanban columns w/ native drag-drop.
   Card modal: editable acceptance criteria + live Gherkin validator. */
const { useState: sUseState, useMemo: sUseMemo } = React;

function gherkinCheck(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const kinds = new Set();
  const issues = [];
  const KW = ['Given', 'When', 'Then', 'And', 'But'];
  lines.forEach(l => {
    const kw = KW.find(k => l.toLowerCase().startsWith(k.toLowerCase() + ' '));
    if (!kw) issues.push(`"${l.slice(0, 22)}…" — no Given/When/Then keyword`);
    else if (kw !== 'And' && kw !== 'But') kinds.add(kw);
  });
  if (!lines.length) return { ok: false, label: 'empty', tone: 'neutral', issues: ['No criteria yet'] };
  ['Given', 'When', 'Then'].forEach(k => { if (!kinds.has(k)) issues.push(`Missing a ${k} clause`); });
  return { ok: issues.length === 0, label: issues.length === 0 ? 'valid Gherkin' : issues.length + ' issue' + (issues.length > 1 ? 's' : ''),
    tone: issues.length === 0 ? 'green' : 'amber', issues };
}

function StoriesWS() {
  const seed = window.SEED.stories;
  const copyJSON = useCopyJSON();
  const [cards, setCards] = sUseState(seed.cards);
  const [filter, setFilter] = sUseState(null);
  const [dragId, setDragId] = sUseState(null);
  const [overCol, setOverCol] = sUseState(null);
  const [modal, setModal] = sUseState(null); // card id

  const epicOf = id => seed.epics.find(e => e.id === id);
  const shown = filter ? cards.filter(c => c.epic === filter) : cards;
  const modalCard = cards.find(c => c.id === modal);

  const move = (id, col) => setCards(cs => cs.map(c => c.id === id ? { ...c, col } : c));
  const update = (id, patch) => setCards(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
  const addStory = () => {
    const id = 's' + Date.now();
    const epic = filter || seed.epics[0].id;
    setCards(cs => [...cs, { id, epic, col: 0, points: 3, title: 'New story', criteria: ['Given …\nWhen …\nThen …'], flagged: false }]);
    setModal(id);
  };

  const payload = () => ({
    project: window.SEED.project, document: 'backlog', generatedAt: new Date().toISOString(),
    businessIntent: seed.intent,
    epics: seed.epics.map(e => ({ id: e.id, title: e.title })),
    columns: seed.columns,
    stories: cards.map(c => ({
      id: c.id, epic: c.epic, epicTitle: epicOf(c.epic).title, status: seed.columns[c.col],
      points: c.points, flaggedForRevision: c.flagged,
      acceptanceCriteria: c.criteria, gherkinValid: c.criteria.every(cr => gherkinCheck(cr).ok),
    })),
  });

  return (
    <>
      <WorkHeader eyebrow="Story & Requirements Board" title="Shape the backlog"
        desc="Business intent branches into epics and stories. Drag cards to set status, open a card to edit acceptance criteria."
        right={<>
          <span className="pill pill-neutral">{cards.length} stories · {cards.reduce((s, c) => s + c.points, 0)} pts</span>
          <Btn kind="soft" sm icon={I.plus} onClick={addStory}>Add story</Btn>
          <Btn kind="primary" icon={I.copy} onClick={() => copyJSON(payload(), 'backlog')}>copy to json</Btn>
        </>} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* epic tree / filter */}
        <div style={{ width: 244, flex: '0 0 244px', borderRight: '1px solid var(--line)', background: 'var(--rail)',
          display: 'flex', flexDirection: 'column', padding: '18px 14px' }} className="scroll">
          <div className="eyebrow" style={{ padding: '0 6px 8px' }}>Business intent</div>
          <div className="serif" style={{ fontSize: 15.5, lineHeight: 1.4, padding: '0 6px 16px', color: 'var(--ink)' }}>
            “{seed.intent}”
          </div>
          <div className="hr" style={{ margin: '2px 0 14px' }}></div>
          <div className="eyebrow" style={{ padding: '0 6px 8px' }}>Epics</div>
          <button onClick={() => setFilter(null)} style={treeRow(!filter)}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ink-faint)' }}></span>
            <span style={{ flex: 1, textAlign: 'left' }}>All stories</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{cards.length}</span>
          </button>
          {seed.epics.map(e => {
            const n = cards.filter(c => c.epic === e.id).length;
            return (
              <div key={e.id}>
                <button onClick={() => setFilter(filter === e.id ? null : e.id)} style={treeRow(filter === e.id)}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: e.color }}></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{e.title}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{n}</span>
                </button>
                {(filter === e.id) && cards.filter(c => c.epic === e.id).map(c => (
                  <button key={c.id} onClick={() => setModal(c.id)} style={{ ...treeRow(false), paddingLeft: 26, fontSize: 12, fontWeight: 500 }}>
                    <span style={{ flex: 1, textAlign: 'left', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    {c.flagged && <span style={{ width: 13, height: 13, display: 'flex', color: 'var(--amber)' }}>{I.flag}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* kanban */}
        <div className="scroll" style={{ flex: 1, minWidth: 0, display: 'flex', gap: 14, padding: 18, alignItems: 'flex-start' }}>
          {seed.columns.map((col, ci) => {
            const colCards = shown.filter(c => c.col === ci);
            const isOver = overCol === ci;
            return (
              <div key={col} onDragOver={e => { e.preventDefault(); setOverCol(ci); }} onDragLeave={() => setOverCol(o => o === ci ? null : o)}
                onDrop={e => { e.preventDefault(); if (dragId != null) move(dragId, ci); setDragId(null); setOverCol(null); }}
                style={{ width: 248, flex: '0 0 248px', display: 'flex', flexDirection: 'column', gap: 10,
                  borderRadius: 13, padding: 10, minHeight: 120,
                  background: isOver ? 'var(--primary-wash)' : 'var(--surface-2)',
                  border: `1.5px ${isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--primary-line)' : 'var(--line)'}`,
                  transition: 'background .15s, border-color .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 2px' }}>
                  <span className="eyebrow" style={{ color: 'var(--ink-soft)' }}>{col}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 'auto' }}>{colCards.length}</span>
                </div>
                {colCards.map(c => {
                  const e = epicOf(c.epic);
                  const allValid = c.criteria.length > 0 && c.criteria.every(cr => gherkinCheck(cr).ok);
                  return (
                    <div key={c.id} draggable onDragStart={() => setDragId(c.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      onClick={() => setModal(c.id)}
                      className="card" style={{ padding: '12px 13px', cursor: 'grab', borderLeft: `3px solid ${e.color}`,
                        opacity: dragId === c.id ? 0.4 : 1, boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                        <span className="mono" style={{ fontSize: 9.5, color: e.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em' }}>{e.title}</span>
                        {c.flagged && <span title="Flagged for AI revision" style={{ width: 13, height: 13, display: 'flex', color: 'var(--amber)', marginLeft: 'auto' }}>{I.flag}</span>}
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, marginBottom: 10 }}>{c.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="pill pill-neutral" style={{ fontSize: 10 }}>{c.points} pts</span>
                        <span className={`pill pill-${allValid ? 'green' : 'amber'}`} style={{ fontSize: 9.5 }}>
                          {c.criteria.length} AC{allValid ? ' ✓' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {ci === 0 && (
                  <button onClick={addStory} className="mono" style={{ border: '1px dashed var(--line-2)', background: 'transparent',
                    borderRadius: 9, padding: '9px', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 11.5, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ width: 13, height: 13, display: 'flex' }}>{I.plus}</span> add story
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modalCard && <StoryModal card={modalCard} epics={seed.epics} columns={seed.columns}
        onClose={() => setModal(null)} onChange={patch => update(modalCard.id, patch)}
        onDelete={() => { setCards(cs => cs.filter(c => c.id !== modalCard.id)); setModal(null); }} />}
    </>
  );

  function treeRow(active) {
    return { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 8px', borderRadius: 8, width: '100%',
      border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: active ? 650 : 500,
      background: active ? 'var(--surface)' : 'transparent', color: 'var(--ink)',
      boxShadow: active ? 'var(--shadow-sm)' : 'none', marginBottom: 1 };
  }
}

function StoryModal({ card, epics, columns, onClose, onChange, onDelete }) {
  const [crit, setCrit] = sUseState(card.criteria.length ? card.criteria : ['Given …\nWhen …\nThen …']);
  const epic = epics.find(e => e.id === card.epic);
  const save = (next) => { setCrit(next); onChange({ criteria: next }); };

  return (
    <Modal eyebrow={epic.title + ' · ' + columns[card.col]}
      title={<input className="input serif" value={card.title} onChange={e => onChange({ title: e.target.value })}
        style={{ fontSize: 21, fontWeight: 500, border: 'none', padding: 0, background: 'transparent' }} />}
      onClose={onClose}
      footer={<>
        <Btn kind="ghost" sm icon={I.trash} onClick={onDelete}>Delete</Btn>
        <div style={{ flex: 1 }}></div>
        <Btn kind={card.flagged ? 'soft' : 'ghost'} sm icon={I.flag} onClick={() => onChange({ flagged: !card.flagged })}
          style={card.flagged ? { color: 'var(--amber)', borderColor: 'var(--amber-line)' } : null}>
          {card.flagged ? 'Flagged for AI' : 'Flag for AI revision'}
        </Btn>
        <Btn kind="primary" sm icon={I.check} onClick={onClose}>Done</Btn>
      </>}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <label style={metaCol()}><span className="eyebrow">Epic</span>
          <select className="select" value={card.epic} onChange={e => onChange({ epic: e.target.value })}>
            {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </label>
        <label style={metaCol()}><span className="eyebrow">Status</span>
          <select className="select" value={card.col} onChange={e => onChange({ col: +e.target.value })}>
            {columns.map((c, i) => <option key={c} value={i}>{c}</option>)}
          </select>
        </label>
        <label style={{ ...metaCol(), maxWidth: 100 }}><span className="eyebrow">Points</span>
          <input className="input mono" type="number" min="0" value={card.points} onChange={e => onChange({ points: +e.target.value })} />
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className="eyebrow">Acceptance criteria</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>Gherkin · Given / When / Then</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {crit.map((c, i) => {
          const v = gherkinCheck(c);
          return (
            <div key={i} className="card" style={{ padding: 12, boxShadow: 'none', borderColor: v.tone === 'green' ? 'var(--green-line)' : v.tone === 'amber' ? 'var(--amber-line)' : 'var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>AC {i + 1}</span>
                <span className={`pill pill-${v.tone === 'green' ? 'green' : v.tone === 'amber' ? 'amber' : 'neutral'}`} style={{ fontSize: 9.5 }}>
                  {v.ok && <span style={{ width: 11, height: 11, display: 'flex' }}>{I.check}</span>}{v.label}
                </span>
                <button onClick={() => save(crit.filter((_, j) => j !== i))} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', width: 22, height: 22 }}>
                  <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span>
                </button>
              </div>
              <textarea className="textarea mono" rows={3} value={c} style={{ fontSize: 12, lineHeight: 1.6 }}
                onChange={e => save(crit.map((x, j) => j === i ? e.target.value : x))} />
              {v.issues.length > 0 && v.tone !== 'neutral' && (
                <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {v.issues.map((iss, k) => <div key={k} className="mono" style={{ fontSize: 10.5, color: 'var(--amber)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 11, height: 11, display: 'flex' }}>{I.warn}</span>{iss}</div>)}
                </div>
              )}
            </div>
          );
        })}
        <Btn kind="soft" sm icon={I.plus} onClick={() => save([...crit, 'Given …\nWhen …\nThen …'])} style={{ alignSelf: 'flex-start' }}>Add criterion</Btn>
      </div>
    </Modal>
  );

  function metaCol() { return { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }; }
}

window.StoriesWS = StoriesWS;
