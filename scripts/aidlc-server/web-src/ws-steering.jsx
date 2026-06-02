/* ws-steering.jsx — Steering: the project's AI steering document (AGENTS.md).
   A single rich document — overview/tech-stack/etc. sections + Conventions (each a rule with
   rationale, good/bad examples and an optional mermaid diagram) + project exceptions.
   JSON-canonical (steering.json); Preview renders the same content that becomes steering.html. */
const { useState: pUseState } = React;

const AGENTS_SECTIONS = [
  ['overview', 'Project overview'],
  ['techStack', 'Tech stack'],
  ['repoStructure', 'Repository structure'],
  ['buildAndRun', 'Build & run'],
  ['architectureDecisions', 'Architecture decisions'],
];

// the rendered steering document, as markdown — also what /aidlc export writes to AGENTS.md.
function steeringMarkdown(agents, conventions, exceptions) {
  let md = '# AGENTS.md\n\n';
  for (const [k, label] of AGENTS_SECTIONS) {
    if ((agents[k] || '').trim()) md += `## ${label}\n\n${agents[k].trim()}\n\n`;
  }
  if ((conventions || []).length) {
    md += '## Conventions\n\n';
    for (const c of conventions) {
      md += `### ${c.title || 'Convention'}\n\n`;
      if ((c.rule || '').trim()) md += `${c.rule.trim()}\n\n`;
      if ((c.rationale || '').trim()) md += `_Why: ${c.rationale.trim()}_\n\n`;
      if ((c.good || '').trim()) md += '✅ Good\n```\n' + c.good.trim() + '\n```\n\n';
      if ((c.bad || '').trim()) md += '🚫 Avoid\n```\n' + c.bad.trim() + '\n```\n\n';
      if ((c.diagram || '').trim()) md += '```mermaid\n' + c.diagram.trim() + '\n```\n\n';
    }
  }
  if ((exceptions || []).length) {
    md += '## Project exceptions\n\n';
    for (const e of exceptions) md += `- **${e.rule || ''}** — \`${e.scope || ''}\` — ${e.note || ''}\n`;
  }
  return md;
}

function SteeringWS() {
  const seed = window.SEED.steering || {};
  const save = useSave();
  const [agents, setAgents] = pUseState(() => seed.agents || {});
  const [conventions, setConventions] = pUseState(() => seed.conventions || []);
  const [exceptions, setExceptions] = pUseState(() => seed.exceptions || []);
  const [view, setView] = pUseState('edit'); // edit | preview

  const buildState = () => ({ agents, conventions, exceptions });
  const updC = (i, patch) => setConventions(conventions.map((c, j) => j === i ? { ...c, ...patch } : c));
  const updE = (i, patch) => setExceptions(exceptions.map((e, j) => j === i ? { ...e, ...patch } : e));
  const fs = { fontSize: 12.5, padding: '7px 9px' };

  const rendered = window.marked ? window.marked.parse(steeringMarkdown(agents, conventions, exceptions)) : '';

  return (
    <>
      <WorkHeader eyebrow="Steering" title="AGENTS.md"
        desc="The steering document an agent reads first — project orientation plus the conventions every agent must follow. Generated to AGENTS.md at the project root."
        right={<>
          <Segmented options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview' }]} value={view} onChange={setView} />
          <span className="pill pill-clay">{conventions.length} conventions</span>
          <Btn kind="primary" icon={I.check} onClick={() => save('steering', buildState())}>Save</Btn>
        </>} />

      {view === 'preview' ? (
        <div className="scroll fadein" style={{ flex: 1, minHeight: 0, padding: '24px 32px' }}>
          <div className="doc-md" dangerouslySetInnerHTML={{ __html: rendered }} />
        </div>
      ) : (
        <div className="scroll fadein" style={{ flex: 1, minHeight: 0, padding: '18px 28px 28px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 860 }}>
          {/* AGENTS.md sections */}
          {AGENTS_SECTIONS.map(([key, label]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="eyebrow">{label}</span>
              <textarea className="textarea" rows={key === 'overview' ? 3 : 3} value={agents[key] || ''}
                onChange={e => setAgents({ ...agents, [key]: e.target.value })} style={{ fontSize: 12.5, lineHeight: 1.55 }} />
            </label>
          ))}

          {/* Conventions */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <span className="eyebrow">Conventions</span>
              <span className="muted" style={{ fontSize: 11.5, marginLeft: 10 }}>standards every agent must follow — with examples & optional diagram</span>
              <Btn kind="soft" sm icon={I.plus} style={{ marginLeft: 'auto' }}
                onClick={() => setConventions([...conventions, { id: 'c' + Date.now(), title: 'New convention', rule: '', rationale: '', good: '', bad: '', diagram: '' }])}>Add</Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {conventions.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>No conventions yet.</div>}
              {conventions.map((c, i) => (
                <div key={c.id || i} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input serif" value={c.title} placeholder="Convention title" onChange={e => updC(i, { title: e.target.value })} style={{ fontSize: 15 }} />
                    <button onClick={() => setConventions(conventions.filter((_, j) => j !== i))} style={{ flex: '0 0 26px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                      <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>
                  </div>
                  <textarea className="textarea" rows={2} value={c.rule} placeholder="The rule — what agents must do" onChange={e => updC(i, { rule: e.target.value })} style={fs} />
                  <input className="input" value={c.rationale} placeholder="Why it matters" onChange={e => updC(i, { rationale: e.target.value })} style={fs} />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <label style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="eyebrow" style={{ color: 'var(--green-deep)' }}>✅ Good example</span>
                      <textarea className="textarea mono" rows={3} value={c.good} onChange={e => updC(i, { good: e.target.value })} style={{ fontSize: 11.5, lineHeight: 1.5 }} />
                    </label>
                    <label style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="eyebrow" style={{ color: 'var(--danger)' }}>🚫 Avoid</span>
                      <textarea className="textarea mono" rows={3} value={c.bad} onChange={e => updC(i, { bad: e.target.value })} style={{ fontSize: 11.5, lineHeight: 1.5 }} />
                    </label>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="eyebrow">Diagram <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>· mermaid source (rendered in Preview / on GitHub)</span></span>
                    <textarea className="textarea mono" rows={c.diagram ? 4 : 1} value={c.diagram} placeholder="sequenceDiagram\n  A->>B: …" onChange={e => updC(i, { diagram: e.target.value })} style={{ fontSize: 11, lineHeight: 1.5 }} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Exceptions */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <span className="eyebrow">Project exceptions</span>
              <Btn kind="soft" sm icon={I.plus} style={{ marginLeft: 'auto' }}
                onClick={() => setExceptions([...exceptions, { rule: '', scope: '', note: '' }])}>Add</Btn>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exceptions.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>None.</div>}
              {exceptions.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input className="input" value={e.rule} placeholder="rule" onChange={ev => updE(i, { rule: ev.target.value })} style={{ ...fs, flex: 1 }} />
                  <input className="input mono" value={e.scope} placeholder="scope (glob)" onChange={ev => updE(i, { scope: ev.target.value })} style={{ ...fs, flex: 1 }} />
                  <input className="input" value={e.note} placeholder="why" onChange={ev => updE(i, { note: ev.target.value })} style={{ ...fs, flex: 1 }} />
                  <button onClick={() => setExceptions(exceptions.filter((_, j) => j !== i))} style={{ flex: '0 0 22px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                    <span style={{ width: 13, height: 13, display: 'flex' }}>{I.x}</span></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.SteeringWS = SteeringWS;
