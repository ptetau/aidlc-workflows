/* ws-infra.jsx — Infrastructure & Deployment Builder.
   Resource blocks inside a VPC boundary, scaling sliders, region toggles,
   a live validation engine, and per-resource override notes. */
const { useState: iUseState } = React;

const RES_META = {
  compute: { icon: I.infra, color: 'var(--primary)', label: 'Compute' },
  lb:      { icon: I.link,  color: 'var(--blue)',    label: 'Load balancer' },
  db:      { icon: I.db,    color: 'var(--violet)',  label: 'Database' },
  cache:   { icon: I.bolt,  color: 'var(--teal)',    label: 'Cache' },
};

function validate(regions, resources) {
  const f = [];
  const activeRegions = regions.filter(r => r.on);
  if (activeRegions.length === 0) f.push({ sev: 'high', res: null, msg: 'No region enabled — the service cannot be deployed.' });
  if (regions.find(r => r.id === 'eu-west' && r.on)) f.push({ sev: 'info', res: null, msg: 'eu-west-1 active: trigger a GDPR data-residency review.' });
  resources.forEach(r => {
    if (r.type === 'db') {
      if (r.public && !r.encrypted) f.push({ sev: 'high', res: r.id, msg: `${r.label} is publicly reachable and not encrypted at rest.` });
      else if (r.public) f.push({ sev: 'med', res: r.id, msg: `${r.label} is exposed to the public internet.` });
      else if (!r.encrypted) f.push({ sev: 'med', res: r.id, msg: `${r.label} is not encrypted at rest.` });
      if (r.public && r.multiAz && activeRegions.length > 1) f.push({ sev: 'info', res: r.id, msg: `${r.label} replicates across regions — confirm cross-region transfer cost.` });
    }
    if (r.type === 'lb' && !r.tls) f.push({ sev: 'high', res: r.id, msg: `${r.label} terminates plaintext HTTP — enable TLS.` });
    if (r.type === 'cache' && r.public) f.push({ sev: 'med', res: r.id, msg: `${r.label} is publicly reachable.` });
    if (r.type === 'compute') {
      if (r.max > 8) f.push({ sev: 'info', res: r.id, msg: `${r.label} scales to ${r.max} instances — confirm budget ceiling.` });
      if (r.min < 2 && activeRegions.length > 1) f.push({ sev: 'med', res: r.id, msg: `${r.label} has no warm failover (min ${r.min}) across regions.` });
    }
  });
  return f;
}
const SEV = { high: { pill: 'danger', color: 'var(--danger)', label: 'HIGH' }, med: { pill: 'amber', color: 'var(--amber)', label: 'MED' }, info: { pill: 'neutral', color: 'var(--ink-faint)', label: 'INFO' } };

function InfraWS() {
  const seed = window.SEED.infra;
  const copyJSON = useCopyJSON();
  const [regions, setRegions] = iUseState(seed.regions);
  const [resources, setResources] = iUseState(seed.resources);
  const [notes, setNotes] = iUseState({});
  const [noteDraft, setNoteDraft] = iUseState(null);

  const findings = validate(regions, resources);
  const worst = id => { const fs = findings.filter(f => f.res === id); if (fs.some(f => f.sev === 'high')) return 'high'; if (fs.some(f => f.sev === 'med')) return 'med'; if (fs.some(f => f.sev === 'info')) return 'info'; return null; };
  const upd = (id, patch) => setResources(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));

  const payload = () => ({
    project: window.SEED.project, document: 'infrastructure', generatedAt: new Date().toISOString(),
    regions: regions.filter(r => r.on).map(r => r.label),
    vpc: { cidr: '10.0.0.0/16' },
    resources: resources.map(r => {
      const { id, type, label, ...config } = r;
      return { id, type, label, config, overrideNote: notes[id] || null };
    }),
    validation: findings.map(f => ({ severity: f.sev, resource: f.res, message: f.msg })),
  });

  const counts = { high: findings.filter(f => f.sev === 'high').length, med: findings.filter(f => f.sev === 'med').length };

  return (
    <>
      <WorkHeader eyebrow="Infrastructure & Deployment Builder" title="Provision the cloud"
        desc="Arrange resources inside the VPC, tune scaling and exposure. The validation engine flags security and policy risks live."
        right={<>
          <span className={`pill pill-${counts.high ? 'danger' : counts.med ? 'amber' : 'green'}`}>
            {counts.high ? `${counts.high} high risk` : counts.med ? `${counts.med} warnings` : 'no blocking risks'}
          </span>
          <Btn kind="primary" icon={I.copy} onClick={() => copyJSON(payload(), 'infrastructure state')}>copy to json</Btn>
        </>} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* canvas */}
        <div className="scroll" style={{ flex: 1, minWidth: 0, padding: 22 }}>
          {/* region bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <span className="eyebrow">Regions / AZs</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {regions.map(r => (
                <button key={r.id} onClick={() => setRegions(rs => rs.map(x => x.id === r.id ? { ...x, on: !x.on } : x))} className="mono" style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                  border: `1.5px solid ${r.on ? 'var(--green-line)' : 'var(--line)'}`, background: r.on ? 'var(--green-wash)' : 'var(--surface-2)',
                  color: r.on ? 'var(--green-deep)' : 'var(--ink-faint)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.on ? 'var(--green)' : 'var(--line-2)' }}></span>{r.label}
                </button>
              ))}
            </div>
          </div>

          {/* VPC boundary */}
          <div style={{ border: '1.5px dashed var(--line-2)', borderRadius: 16, padding: '14px 16px 18px', position: 'relative', background: 'var(--surface-2)' }}>
            <div className="mono" style={{ position: 'absolute', top: -10, left: 16, background: 'var(--bg)', padding: '0 8px', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: '.04em' }}>
              VPC · 10.0.0.0/16 · {regions.filter(r => r.on).length} region{regions.filter(r => r.on).length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 14, marginTop: 6 }}>
              {resources.map(r => {
                const m = RES_META[r.type]; const w = worst(r.id);
                const note = notes[r.id];
                return (
                  <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden',
                    borderColor: w === 'high' ? 'var(--danger)' : w === 'med' ? 'var(--amber-line)' : 'var(--line)',
                    boxShadow: w === 'high' ? '0 0 0 3px var(--danger-wash)' : 'var(--shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 13px 10px' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-3)', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 28px' }}>
                        <span style={{ width: 16, height: 16, display: 'flex' }}>{m.icon}</span></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mono" style={{ fontSize: 9, color: m.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.2 }}>{r.label}</div>
                      </div>
                      {w && <span style={{ width: 15, height: 15, display: 'flex', color: SEV[w].color }} title={SEV[w].label + ' finding'}>{w === 'info' ? I.shield : I.warn}</span>}
                    </div>
                    <div style={{ padding: '4px 13px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {r.type === 'compute' && <>
                        <SliderRow label="Min instances" value={r.min} min={1} max={6} onChange={v => upd(r.id, { min: Math.min(v, r.max) })} />
                        <SliderRow label="Max instances" value={r.max} min={2} max={16} onChange={v => upd(r.id, { max: Math.max(v, r.min) })} />
                        <SliderRow label="Target CPU" value={r.cpu} min={30} max={90} suffix="%" onChange={v => upd(r.id, { cpu: v })} />
                        <ToggleRow label="Public ingress" on={r.public} onChange={v => upd(r.id, { public: v })} danger />
                      </>}
                      {r.type === 'lb' && <>
                        <ToggleRow label="TLS termination" on={r.tls} onChange={v => upd(r.id, { tls: v })} />
                        <ToggleRow label="Internet-facing" on={r.public} onChange={v => upd(r.id, { public: v })} />
                      </>}
                      {r.type === 'db' && <>
                        <ToggleRow label="Multi-AZ" on={r.multiAz} onChange={v => upd(r.id, { multiAz: v })} />
                        <ToggleRow label="Encrypted at rest" on={r.encrypted} onChange={v => upd(r.id, { encrypted: v })} />
                        <ToggleRow label="Publicly reachable" on={r.public} onChange={v => upd(r.id, { public: v })} danger />
                      </>}
                      {r.type === 'cache' && <>
                        <ToggleRow label="Encrypted" on={r.encrypted} onChange={v => upd(r.id, { encrypted: v })} />
                        <ToggleRow label="Publicly reachable" on={r.public} onChange={v => upd(r.id, { public: v })} danger />
                      </>}

                      {note !== undefined && noteDraft !== r.id && (
                        <div style={{ background: 'var(--note)', border: '1px solid var(--note-line)', borderRadius: 9, padding: '8px 10px', position: 'relative' }}>
                          <div className="mono" style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--note-ink)', opacity: .8, marginBottom: 3 }}>OVERRIDE NOTE</div>
                          <div style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--note-ink)' }}>{note}</div>
                          <button onClick={() => setNotes(n => { const c = { ...n }; delete c[r.id]; return c; })} style={{ position: 'absolute', top: 5, right: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--note-ink)', opacity: .6, width: 16, height: 16 }}>
                            <span style={{ width: 11, height: 11, display: 'flex' }}>{I.x}</span></button>
                        </div>
                      )}
                      {noteDraft === r.id && (
                        <div>
                          <textarea className="textarea" autoFocus rows={2} placeholder="Document the override decision…" defaultValue={note || ''}
                            style={{ fontSize: 11.5 }} onBlur={e => { setNotes(n => ({ ...n, [r.id]: e.target.value.trim() || 'Manual override.' })); setNoteDraft(null); }} />
                        </div>
                      )}
                      {note === undefined && noteDraft !== r.id && (
                        <button onClick={() => setNoteDraft(r.id)} className="mono" style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 10.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 12, height: 12, display: 'flex' }}>{I.note}</span>add override note</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* validation engine */}
        <div style={{ width: 300, flex: '0 0 300px', borderLeft: '1px solid var(--line)', background: 'var(--rail)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '15px 16px 12px', borderBottom: '1px solid var(--rail-line)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 16, height: 16, display: 'flex', color: findings.some(f => f.sev === 'high') ? 'var(--danger)' : 'var(--green)' }}>{I.shield}</span>
            <span className="eyebrow">Validation engine</span>
            <span className="pill pill-neutral" style={{ marginLeft: 'auto', fontSize: 10 }}>{findings.length}</span>
          </div>
          <div className="scroll" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {findings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--green-deep)' }}>
                <div style={{ width: 30, height: 30, margin: '0 auto 10px', display: 'flex' }}>{I.check}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>All checks pass</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>No security or policy violations detected.</div>
              </div>
            )}
            {['high', 'med', 'info'].flatMap(sev => findings.filter(f => f.sev === sev)).map((f, i) => {
              const s = SEV[f.sev]; const res = resources.find(r => r.id === f.res);
              return (
                <div key={i} className="card" style={{ padding: '10px 12px', boxShadow: 'none', borderColor: f.sev === 'high' ? 'var(--danger)' : 'var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span className={`pill pill-${s.pill}`} style={{ fontSize: 9 }}>{s.label}</span>
                    {res && <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>{res.label}</span>}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink)' }}>{f.msg}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function SliderRow({ label, value, min, max, onChange, suffix }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>{value}{suffix || ''}</span>
      </div>
      <input type="range" className="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)} />
    </div>
  );
}
function ToggleRow({ label, on, onChange, danger }) {
  const risky = danger && on;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: risky ? 'var(--danger)' : 'var(--ink-soft)' }}>{label}</span>
      <div style={{ marginLeft: 'auto' }}><Switch on={on} onChange={onChange} /></div>
    </div>
  );
}

window.InfraWS = InfraWS;
