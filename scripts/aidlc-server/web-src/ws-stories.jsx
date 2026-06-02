/* ws-stories.jsx — Backlog: editing-first outline.
   Agents execute most stories; the human job is specifying them (acceptance criteria) and
   marking the few that need a person. Grouped by epic; click a story to edit inline.
   Readiness is derived: done | ready (criteria valid) | needs detail. */
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
  if (!lines.length) return { ok: false, issues: ['No criteria yet'] };
  ['Given', 'When', 'Then'].forEach(k => { if (!kinds.has(k)) issues.push(`Missing a ${k} clause`); });
  return { ok: issues.length === 0, issues };
}

// derived readiness — drives the pill + filters
function readiness(card) {
  if (card.done) return { key: 'done', label: 'done', pill: 'green' };
  const has = Array.isArray(card.criteria) && card.criteria.length > 0;
  const allValid = has && card.criteria.every(c => gherkinCheck(c).ok);
  if (allValid) return { key: 'ready', label: 'ready for agent', pill: 'clay' };
  return { key: 'draft', label: 'needs detail', pill: 'amber' };
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Needs detail' },
  { id: 'ready', label: 'Ready' },
  { id: 'human', label: 'Human steps' },
  { id: 'done', label: 'Done' },
];

function StoriesWS() {
  const seed = window.SEED.stories;
  const save = useSave();
  const [cards, setCards] = sUseState(seed.cards);
  const [personas, setPersonas] = sUseState(() => seed.personas || []);
  const [filter, setFilter] = sUseState('all');
  const [open, setOpen] = sUseState(null); // expanded story id
  const [tab, setTab] = sUseState('backlog'); // backlog | personas | map
  usePendingNav(setTab); // arrive from a unit→story link → open Backlog + scroll to the story

  const epicOf = id => seed.epics.find(e => e.id === id) || { title: 'No epic', color: 'var(--ink-faint)' };
  const update = (id, patch) => setCards(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
  const matches = c => {
    if (filter === 'all') return true;
    if (filter === 'human') return !!c.human;
    return readiness(c).key === filter;
  };
  const addStory = (epicId) => {
    const id = 's' + Date.now();
    setCards(cs => [...cs, { id, epic: epicId, title: 'New story', criteria: [], human: false, done: false, points: 3 }]);
    setOpen(id);
  };

  const counts = {
    total: cards.length,
    human: cards.filter(c => c.human).length,
    done: cards.filter(c => readiness(c).key === 'done').length,
    draft: cards.filter(c => readiness(c).key === 'draft').length,
  };

  const buildState = () => ({ intent: seed.intent, epics: seed.epics, cards, personas });

  const TITLE = { backlog: 'Specify the work', personas: 'Who it serves', map: 'Story → persona map' };
  const DESC = {
    backlog: 'Agents build most stories — your job is to make each one unambiguous and flag the few that need a person. Click a story to edit its acceptance criteria.',
    personas: 'The people this product serves — their goals and frustrations. Stories map to the roles that use them.',
    map: 'Which persona/role each story serves (the RBAC matrix). Toggle a cell to assign a story to a role.',
  };

  return (
    <>
      <WorkHeader eyebrow="Backlog" title={TITLE[tab]} desc={DESC[tab]}
        right={<>
          <Segmented options={[{ value: 'backlog', label: 'Backlog' }, { value: 'personas', label: 'Personas' }, { value: 'map', label: 'Map' }]} value={tab} onChange={setTab} />
          {tab === 'backlog' && <>
            <span className="pill pill-neutral">{counts.total} stories</span>
            {counts.human > 0 && <span className="pill pill-amber">{counts.human} human</span>}
            <span className="pill pill-green">{counts.done} done</span>
          </>}
          <Btn kind="primary" icon={I.check} onClick={() => save('stories', buildState())}>Save</Btn>
        </>} />

      {tab === 'personas' && <PersonasTab personas={personas} setPersonas={setPersonas} />}
      {tab === 'map' && <StoryPersonaMap cards={cards} update={update} personas={personas} epicOf={epicOf} />}
      {tab !== 'backlog' ? null : <>

      {/* intent + filters */}
      <div style={{ padding: '14px 28px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {seed.intent && <div className="serif" style={{ fontSize: 14.5, color: 'var(--ink-soft)', flex: 1, minWidth: 240 }}>“{seed.intent}”</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const on = filter === f.id;
            const n = f.id === 'all' ? counts.total : cards.filter(c => f.id === 'human' ? c.human : readiness(c).key === f.id).length;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} className="mono" style={{
                border: `1px solid ${on ? 'var(--primary)' : 'var(--line-2)'}`, cursor: 'pointer',
                background: on ? 'var(--primary-wash)' : 'var(--surface)', color: on ? 'var(--primary-deep)' : 'var(--ink-soft)',
                borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600,
              }}>{f.label} <span style={{ opacity: .6 }}>{n}</span></button>
            );
          })}
        </div>
      </div>

      {/* outline */}
      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: '14px 28px 28px' }}>
        {seed.epics.map(epic => {
          const items = cards.filter(c => c.epic === epic.id && matches(c));
          const epicTotal = cards.filter(c => c.epic === epic.id).length;
          if (items.length === 0 && filter !== 'all') return null;
          return (
            <div key={epic.id} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: epic.color, flex: '0 0 9px' }}></span>
                <span className="eyebrow" style={{ color: 'var(--ink-soft)' }}>{epic.title}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{epicTotal}</span>
                <button onClick={() => addStory(epic.id)} className="mono" title="Add a story to this epic" style={{
                  marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)',
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, display: 'flex' }}>{I.plus}</span>add
                </button>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {items.length === 0 && <div className="muted" style={{ padding: '12px 15px', fontSize: 12.5 }}>No stories.</div>}
                {items.map((c, i) => (
                  <StoryRow key={c.id} card={c} epicColor={epic.color} first={i === 0} personas={personas}
                    expanded={open === c.id} onToggle={() => setOpen(o => o === c.id ? null : c.id)}
                    onChange={patch => update(c.id, patch)}
                    onDelete={() => { setCards(cs => cs.filter(x => x.id !== c.id)); setOpen(null); }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </>}
    </>
  );
}

function StoryRow({ card, epicColor, first, expanded, onToggle, onChange, onDelete, personas }) {
  const r = readiness(card);
  const setCrit = next => onChange({ criteria: next });
  // back-link: which unit delivers this story (read from the loaded arch state)
  const units = (window.SEED.arch && window.SEED.arch.units) || [];
  const unit = units.find(u => (u.stories || []).includes(card.code) || (u.stories || []).includes(card.id));
  return (
    <div data-anchor={card.code || card.id} style={{ borderTop: first ? 'none' : '1px solid var(--line)' }}>
      {/* summary row */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer' }}>
        <span style={{ width: 13, height: 13, display: 'flex', color: 'var(--ink-faint)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .14s' }}>{I.chevR}</span>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: epicColor, flex: '0 0 4px' }}></span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</span>
        {unit && <RefChip ws="arch" tab="units" anchor={unit.id} title={'Unit: ' + unit.name}>unit: {unit.name}</RefChip>}
        <span className={`pill pill-${card.human ? 'amber' : 'neutral'}`} style={{ fontSize: 9.5 }}>
          {card.human ? 'human' : 'agent'}
        </span>
        <span className={`pill pill-${r.pill}`} style={{ fontSize: 9.5 }}>
          {r.key === 'done' && <span style={{ width: 11, height: 11, display: 'flex' }}>{I.check}</span>}{r.label}
        </span>
      </div>

      {/* inline editor */}
      {expanded && (
        <div className="fadein" style={{ padding: '4px 16px 18px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input serif" value={card.title} onChange={e => onChange({ title: e.target.value })}
            style={{ fontSize: 16, fontWeight: 500 }} />

          {/* id + priority */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="eyebrow">Story ID</span>
              <input className="input mono" value={card.code || ''} placeholder="US-XXX-001" onChange={e => onChange({ code: e.target.value })} style={{ fontSize: 12, padding: '6px 9px', width: 150 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="eyebrow">Priority</span>
              <select className="select" value={card.priority || 'Should'} onChange={e => onChange({ priority: e.target.value })} style={{ fontSize: 12, padding: '6px 9px', width: 130 }}>
                {['Must', 'Should', 'Could', "Won't"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>

          {/* narrative */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Narrative</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['asA', 'As a', 'librarian'], ['iWant', 'I want', 'to renew a loan'], ['soThat', 'so that', 'members keep books longer']].map(([k, label, ph]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', flex: '0 0 64px', textAlign: 'right' }}>{label}</span>
                  <input className="input" value={card[k] || ''} placeholder={ph} onChange={e => onChange({ [k]: e.target.value })} style={{ fontSize: 12.5, padding: '6px 9px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* roles (RBAC) */}
          {personas && personas.length > 0 && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Roles served</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {personas.map(p => {
                  const role = p.role || p.name;
                  const on = (card.roles || []).includes(role);
                  return (
                    <button key={p.id || role} onClick={() => onChange({ roles: on ? (card.roles || []).filter(x => x !== role) : [...(card.roles || []), role] })}
                      className="mono" style={{ border: `1px solid ${on ? 'var(--primary)' : 'var(--line-2)'}`, cursor: 'pointer',
                        background: on ? 'var(--primary-wash)' : 'var(--surface)', color: on ? 'var(--primary-deep)' : 'var(--ink-soft)',
                        borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600 }}>{role}</button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="eyebrow">Acceptance criteria</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>Gherkin · Given / When / Then — agents build to these</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(card.criteria || []).map((c, i) => {
                const v = gherkinCheck(c);
                return (
                  <div key={i} className="card" style={{ padding: 11, boxShadow: 'none', borderColor: v.ok ? 'var(--green-line)' : 'var(--amber-line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>AC {i + 1}</span>
                      <span className={`pill pill-${v.ok ? 'green' : 'amber'}`} style={{ fontSize: 9 }}>
                        {v.ok ? 'valid' : v.issues.length + ' issue' + (v.issues.length > 1 ? 's' : '')}</span>
                      <button onClick={() => setCrit(card.criteria.filter((_, j) => j !== i))} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', width: 20, height: 20 }}>
                        <span style={{ width: 12, height: 12, display: 'flex' }}>{I.x}</span></button>
                    </div>
                    <textarea className="textarea mono" rows={3} value={c} style={{ fontSize: 12, lineHeight: 1.6 }}
                      onChange={e => setCrit(card.criteria.map((x, j) => j === i ? e.target.value : x))} />
                    {!v.ok && <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {v.issues.map((iss, k) => <div key={k} className="mono" style={{ fontSize: 10.5, color: 'var(--amber)', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ width: 11, height: 11, display: 'flex' }}>{I.warn}</span>{iss}</div>)}
                    </div>}
                  </div>
                );
              })}
              <Btn kind="soft" sm icon={I.plus} onClick={() => setCrit([...(card.criteria || []), 'Given …\nWhen …\nThen …'])} style={{ alignSelf: 'flex-start' }}>Add criterion</Btn>
            </div>
          </div>

          {/* execution controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', paddingTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)' }}>
              <Switch on={!!card.human} onChange={v => onChange({ human: v })} />
              Needs a human step
              <span className="muted" style={{ fontSize: 11 }}>(decision, credential, manual check)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)' }}>
              <Switch on={!!card.done} onChange={v => onChange({ done: v })} />
              Done
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--ink-soft)', marginLeft: 'auto' }}>
              size
              <input className="input mono" type="number" min="0" value={card.points ?? 0}
                onChange={e => onChange({ points: +e.target.value })} style={{ width: 64, fontSize: 12, padding: '6px 8px' }} />
            </label>
            <Btn kind="ghost" sm icon={I.trash} onClick={onDelete}>Delete</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Personas tab ---- */
function PersonasTab({ personas, setPersonas }) {
  const upd = (i, patch) => setPersonas(personas.map((p, j) => j === i ? { ...p, ...patch } : p));
  const add = () => setPersonas([...personas, { id: 'p' + Date.now(), name: 'New persona', role: '', goals: '', frustrations: '' }]);
  return (
    <div className="scroll fadein" style={{ flex: 1, minHeight: 0, padding: '18px 28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, maxWidth: 900 }}>
        <span className="eyebrow">Personas</span>
        <Btn kind="soft" sm icon={I.plus} onClick={add} style={{ marginLeft: 'auto' }}>Add persona</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, maxWidth: 1100 }}>
        {personas.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No personas yet — add the people this product serves.</div>}
        {personas.map((p, i) => (
          <div key={p.id || i} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input serif" value={p.name} placeholder="Name" onChange={e => upd(i, { name: e.target.value })} style={{ fontSize: 15, fontWeight: 500 }} />
              <button onClick={() => setPersonas(personas.filter((_, j) => j !== i))} style={{ flex: '0 0 26px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>
            </div>
            <input className="input mono" value={p.role || ''} placeholder="role (e.g. librarian)" onChange={e => upd(i, { role: e.target.value })} style={{ fontSize: 12, padding: '6px 9px' }} />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="eyebrow">Goals</span>
              <textarea className="textarea" rows={2} value={p.goals || ''} onChange={e => upd(i, { goals: e.target.value })} style={{ fontSize: 12.5 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="eyebrow">Frustrations</span>
              <textarea className="textarea" rows={2} value={p.frustrations || ''} onChange={e => upd(i, { frustrations: e.target.value })} style={{ fontSize: 12.5 }} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Story → persona (RBAC) matrix ---- */
function StoryPersonaMap({ cards, update, personas, epicOf }) {
  const roles = personas.map(p => p.role || p.name).filter(Boolean);
  const toggle = (card, role) => {
    const on = (card.roles || []).includes(role);
    update(card.id, { roles: on ? (card.roles || []).filter(x => x !== role) : [...(card.roles || []), role] });
  };
  if (roles.length === 0) return <div style={{ padding: 40 }} className="muted">Add personas (with roles) first — then assign stories to them here.</div>;
  return (
    <div className="scroll fadein" style={{ flex: 1, minHeight: 0, padding: '18px 28px 28px' }}>
      <div style={{ display: 'inline-grid', gridTemplateColumns: `minmax(220px,1fr) repeat(${roles.length}, 96px)`, gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 11, overflow: 'hidden' }}>
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px' }} className="eyebrow">Story</div>
        {roles.map(r => <div key={r} className="eyebrow" style={{ background: 'var(--surface-2)', padding: '10px 8px', textAlign: 'center' }}>{r}</div>)}
        {cards.map(c => (
          <React.Fragment key={c.id}>
            <div style={{ background: 'var(--surface)', padding: '9px 12px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 14, borderRadius: 2, background: epicOf(c.epic).color, flex: '0 0 4px' }}></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
            </div>
            {roles.map(r => {
              const on = (c.roles || []).includes(r);
              return (
                <button key={r} onClick={() => toggle(c, r)} title={(on ? 'Remove ' : 'Assign ') + r} style={{
                  background: on ? 'var(--green-wash)' : 'var(--surface)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 0' }}>
                  <span style={{ width: 15, height: 15, display: 'flex', color: on ? 'var(--green)' : 'var(--line-2)' }}>{on ? I.check : I.plus}</span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

window.StoriesWS = StoriesWS;
