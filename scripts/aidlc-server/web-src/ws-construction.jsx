/* ws-construction.jsx — functional-design workspaces: domain entities + business rules.
   Both are JSON-canonical (save → ingest), highly structured (typed fields, BR ids + traces). */
const { useState: kUseState } = React;

/* ---------------- Domain entities ---------------- */
function EntitiesWS() {
  const seed = window.SEED.entities || {};
  const save = useSave();
  const [entities, setEntities] = kUseState(() => seed.entities || []);
  const [open, setOpen] = kUseState(0);

  const upd = (i, patch) => setEntities(entities.map((e, j) => j === i ? { ...e, ...patch } : e));
  const addEntity = () => { setEntities([...entities, { name: 'NewEntity', fields: [], invariants: [] }]); setOpen(entities.length); };
  const fs = { fontSize: 12, padding: '6px 8px' };

  return (
    <>
      <WorkHeader eyebrow="Functional Design · Domain" title="Model the data"
        desc="The domain entities and their typed fields, constraints and invariants — the shape agents build to."
        right={<>
          <span className="pill pill-neutral">{entities.length} entities</span>
          <Btn kind="soft" sm icon={I.plus} onClick={addEntity}>Add entity</Btn>
          <Btn kind="primary" icon={I.check} onClick={() => save('entities', { entities })}>Save</Btn>
        </>} />
      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: '16px 28px 28px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1000 }}>
        {entities.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No entities yet.</div>}
        {entities.map((e, i) => {
          const expanded = open === i;
          const setFields = next => upd(i, { fields: next });
          return (
            <div key={i} className="card" style={{ overflow: 'hidden' }}>
              <div onClick={() => setOpen(expanded ? -1 : i)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}>
                <span style={{ width: 13, height: 13, display: 'flex', color: 'var(--ink-faint)', transform: expanded ? 'rotate(90deg)' : 'none' }}>{I.chevR}</span>
                <span style={{ width: 18, height: 18, display: 'flex', color: 'var(--violet)' }}>{I.db}</span>
                <span className="serif" style={{ flex: 1, fontSize: 15 }}>{e.name}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{(e.fields || []).length} fields</span>
                <button onClick={ev => { ev.stopPropagation(); setEntities(entities.filter((_, j) => j !== i)); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', width: 22 }}>
                  <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>
              </div>
              {expanded && (
                <div className="fadein" style={{ padding: '0 14px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className="input serif" value={e.name} onChange={ev => upd(i, { name: ev.target.value })} style={{ fontSize: 15 }} />
                  {/* fields table */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                      <span className="eyebrow">Fields</span>
                      <button onClick={() => setFields([...(e.fields || []), { field: '', type: '', constraints: '', description: '' }])} className="mono" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600 }}>+ add field</button>
                    </div>
                    {(e.fields || []).length > 0 && (
                      <div className="eyebrow" style={{ display: 'flex', gap: 6, padding: '0 2px 4px' }}>
                        <span style={{ flex: '0 0 130px' }}>field</span><span style={{ flex: '0 0 130px' }}>type</span><span style={{ flex: 1 }}>constraints</span><span style={{ flex: 1 }}>description</span><span style={{ width: 20 }}></span>
                      </div>
                    )}
                    {(e.fields || []).map((f, fi) => {
                      const setF = patch => setFields(e.fields.map((x, j) => j === fi ? { ...x, ...patch } : x));
                      return (
                        <div key={fi} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                          <input className="input mono" value={f.field} onChange={ev => setF({ field: ev.target.value })} style={{ ...fs, flex: '0 0 130px' }} />
                          <input className="input mono" value={f.type} onChange={ev => setF({ type: ev.target.value })} style={{ ...fs, flex: '0 0 130px' }} />
                          <input className="input" value={f.constraints} onChange={ev => setF({ constraints: ev.target.value })} style={{ ...fs, flex: 1 }} />
                          <input className="input" value={f.description} onChange={ev => setF({ description: ev.target.value })} style={{ ...fs, flex: 1 }} />
                          <button onClick={() => setFields(e.fields.filter((_, j) => j !== fi))} style={{ flex: '0 0 20px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}><span style={{ width: 12, height: 12, display: 'flex' }}>{I.x}</span></button>
                        </div>
                      );
                    })}
                  </div>
                  {/* invariants */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                      <span className="eyebrow">Invariants</span>
                      <button onClick={() => upd(i, { invariants: [...(e.invariants || []), ''] })} className="mono" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600 }}>+ add</button>
                    </div>
                    {(e.invariants || []).map((iv, ii) => (
                      <div key={ii} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                        <input className="input" value={iv} onChange={ev => upd(i, { invariants: e.invariants.map((x, j) => j === ii ? ev.target.value : x) })} style={fs} />
                        <button onClick={() => upd(i, { invariants: e.invariants.filter((_, j) => j !== ii) })} style={{ flex: '0 0 20px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}><span style={{ width: 12, height: 12, display: 'flex' }}>{I.x}</span></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Business rules ---------------- */
function RulesWS() {
  const seed = window.SEED.rules || {};
  const save = useSave();
  const [groups, setGroups] = kUseState(() => seed.groups || []);
  const updG = (gi, patch) => setGroups(groups.map((g, j) => j === gi ? { ...g, ...patch } : g));
  const updR = (gi, ri, patch) => updG(gi, { rules: groups[gi].rules.map((r, j) => j === ri ? { ...r, ...patch } : r) });
  const count = groups.reduce((n, g) => n + (g.rules || []).length, 0);
  const fs = { fontSize: 12, padding: '6px 8px' };
  usePendingNav(); // BR rows are link targets (BR-* anchors)

  return (
    <>
      <WorkHeader eyebrow="Functional Design · Rules" title="Encode the rules"
        desc="Business rules (BR-*) the implementation must enforce, traced back to the requirements that motivate them."
        right={<>
          <span className="pill pill-neutral">{count} rules</span>
          <Btn kind="soft" sm icon={I.plus} onClick={() => setGroups([...groups, { title: 'New group', rules: [] }])}>Add group</Btn>
          <Btn kind="primary" icon={I.check} onClick={() => save('rules', { groups })}>Save</Btn>
        </>} />
      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: '16px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
        {groups.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No rules yet.</div>}
        {groups.map((g, gi) => (
          <div key={gi}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input className="input" value={g.title} onChange={e => updG(gi, { title: e.target.value })} style={{ ...fs, fontWeight: 650, maxWidth: 280 }} />
              <button onClick={() => updG(gi, { rules: [...(g.rules || []), { id: 'BR-', text: '', traces: [] }] })} className="mono" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600 }}>+ rule</button>
              <button onClick={() => setGroups(groups.filter((_, j) => j !== gi))} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', width: 22 }}><span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {(g.rules || []).length === 0 && <div className="muted" style={{ padding: '10px 14px', fontSize: 12.5 }}>No rules.</div>}
              {(g.rules || []).map((r, ri) => (
                <div key={ri} data-anchor={r.id} style={{ display: 'flex', gap: 8, padding: '10px 13px', borderTop: ri ? '1px solid var(--line)' : 'none', alignItems: 'flex-start' }}>
                  <input className="input mono" value={r.id} onChange={e => updR(gi, ri, { id: e.target.value })} style={{ ...fs, flex: '0 0 90px', fontWeight: 600 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <textarea className="textarea" rows={Math.max(2, (r.text || '').split('\n').length)} value={r.text} placeholder="The system must…" onChange={e => updR(gi, ri, { text: e.target.value })} style={{ ...fs, lineHeight: 1.5 }} />
                    {(r.traces || []).length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>traces →</span>
                        {(r.traces || []).map((tr, ti) => <RefChip key={ti} ws="clarify" tab="requirements" anchor={tr}>{tr}</RefChip>)}
                      </div>
                    )}
                    <input className="input mono" value={(r.traces || []).join(', ')} placeholder="traces: FR-001, FR-002" onChange={e => updR(gi, ri, { traces: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={{ fontSize: 10.5, padding: '5px 8px', color: 'var(--ink-soft)' }} />
                  </div>
                  <button onClick={() => updG(gi, { rules: g.rules.filter((_, j) => j !== ri) })} style={{ flex: '0 0 20px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}><span style={{ width: 12, height: 12, display: 'flex' }}>{I.x}</span></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

window.EntitiesWS = EntitiesWS;
window.RulesWS = RulesWS;
