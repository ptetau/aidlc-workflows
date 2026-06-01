/* ws-architecture.jsx — Architecture Topology Canvas.
   Node-graph editor: drag nodes, draw connections from ports,
   inspect/edit node schema in side panel, generate a mock payload. */
const { useState: aUseState, useRef: aUseRef, useEffect: aUseEffect, useCallback: aUseCallback } = React;

const NODE_META = {
  api:   { icon: I.api,   color: 'var(--primary)', tint: 'var(--primary-wash)', line: 'var(--primary-line)', label: 'Service' },
  db:    { icon: I.db,    color: 'var(--violet)',  tint: 'rgba(130,104,201,.12)', line: 'rgba(130,104,201,.4)', label: 'Database' },
  ui:    { icon: I.ui,    color: 'var(--blue)',    tint: 'rgba(74,115,196,.12)',  line: 'rgba(74,115,196,.4)',  label: 'Frontend' },
  queue: { icon: I.queue, color: 'var(--teal)',    tint: 'rgba(47,138,134,.12)',  line: 'rgba(47,138,134,.4)',  label: 'Queue' },
};
const NODE_W = 168, NODE_H = 92;

function ArchWS() {
  const seed = window.SEED.arch;
  const copyJSON = useCopyJSON();   // used only for the Prototype tab's mock payload
  const save = useSave();
  const [nodes, setNodes] = aUseState(() => seed.nodes.map(n => ({ ...n })));
  const [edges, setEdges] = aUseState(() => seed.edges.map(e => ({ ...e })));
  const [pan, setPan] = aUseState({ x: 20, y: 10 });
  const [zoom, setZoom] = aUseState(1);
  const [sel, setSel] = aUseState('agg');
  const [tab, setTab] = aUseState('inspect');
  const [conn, setConn] = aUseState(null); // {from, x, y} live connection
  const wrapRef = aUseRef(null);
  const drag = aUseRef(null);

  const selNode = nodes.find(n => n.id === sel);
  const toCanvas = (cx, cy) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
  };

  // ---- node / pan dragging ----
  aUseEffect(() => {
    const mv = e => {
      if (drag.current?.type === 'node') {
        const p = toCanvas(e.clientX, e.clientY);
        setNodes(ns => ns.map(n => n.id === drag.current.id ? { ...n, x: p.x - drag.current.dx, y: p.y - drag.current.dy } : n));
      } else if (drag.current?.type === 'pan') {
        setPan({ x: drag.current.px + (e.clientX - drag.current.sx), y: drag.current.py + (e.clientY - drag.current.sy) });
      } else if (drag.current?.type === 'conn') {
        const p = toCanvas(e.clientX, e.clientY);
        setConn(c => c ? { ...c, x: p.x, y: p.y } : c);
      }
    };
    const up = e => {
      if (drag.current?.type === 'conn') {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const nodeEl = el && el.closest('[data-node]');
        const to = nodeEl && nodeEl.getAttribute('data-node');
        if (to && to !== drag.current.from) {
          setEdges(es => es.some(x => x.from === drag.current.from && x.to === to) ? es : [...es, { from: drag.current.from, to }]);
        }
        setConn(null);
      }
      drag.current = null;
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  }, [pan, zoom]);

  const startNodeDrag = (e, n) => {
    e.stopPropagation();
    const p = toCanvas(e.clientX, e.clientY);
    drag.current = { type: 'node', id: n.id, dx: p.x - n.x, dy: p.y - n.y };
    setSel(n.id); setTab('inspect');
  };
  const startPan = e => { drag.current = { type: 'pan', sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }; setSel(null); };
  const startConn = (e, n) => {
    e.stopPropagation();
    const p = toCanvas(e.clientX, e.clientY);
    drag.current = { type: 'conn', from: n.id };
    setConn({ from: n.id, x: p.x, y: p.y });
  };

  const addNode = (type) => {
    const id = type + Date.now().toString(36).slice(-4);
    const r = wrapRef.current.getBoundingClientRect();
    const c = toCanvas(r.left + r.width / 2, r.top + r.height / 2);
    setNodes(ns => [...ns, { id, type, label: 'New ' + NODE_META[type].label.toLowerCase(), x: c.x - NODE_W / 2, y: c.y - NODE_H / 2, fields: [] }]);
    setSel(id); setTab('inspect');
  };
  const delNode = id => { setNodes(ns => ns.filter(n => n.id !== id)); setEdges(es => es.filter(e => e.from !== id && e.to !== id)); setSel(null); };

  const port = (n, side) => ({ x: n.x + (side === 'out' ? NODE_W : 0), y: n.y + NODE_H / 2 });
  const edgePath = (a, b) => {
    const s = port(a, 'out'), t = port(b, 'in');
    const dx = Math.max(40, Math.abs(t.x - s.x) * 0.5);
    return `M ${s.x} ${s.y} C ${s.x + dx} ${s.y}, ${t.x - dx} ${t.y}, ${t.x} ${t.y}`;
  };

  // editable state in SEED shape — persisted to workspace/arch.json
  const buildState = () => ({
    nodes: nodes.map(n => ({ id: n.id, type: n.type, label: n.label, x: Math.round(n.x), y: Math.round(n.y), fields: n.fields })),
    edges: edges.map(e => ({ from: e.from, to: e.to })),
  });

  const mockPayload = () => {
    const start = nodes.find(n => !edges.some(e => e.to === n.id)) || nodes[0];
    const chain = []; let cur = start, guard = 0;
    while (cur && guard++ < 12) { chain.push(cur); const nx = edges.find(e => e.from === cur.id); cur = nx ? nodes.find(n => n.id === nx.to) : null; }
    return {
      endpoint: 'POST /v1/usage',
      request: { customerId: 'cus_9F2a', events: [{ type: 'compute.seconds', quantity: 4200, ts: '2026-06-02T00:00:00Z' }] },
      pipeline: chain.map(n => ({ node: n.id, type: n.type, label: n.label })),
      response: { accepted: true, aggregatedInto: (chain.find(n => n.type === 'db') || {}).id || null, status: 202 },
    };
  };

  return (
    <>
      <WorkHeader eyebrow="Architecture Topology Canvas" title="Map the system"
        desc="Drag nodes to lay out the system. Drag from a node's right port onto another to define data flow. Click a node to edit its schema."
        right={<>
          <span className="pill pill-neutral">{nodes.length} nodes · {edges.length} edges</span>
          <Btn kind="primary" icon={I.check} onClick={() => save('arch', buildState())}>Save</Btn>
        </>} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* canvas */}
        <div ref={wrapRef} onPointerDown={startPan} style={{
          flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', cursor: drag.current?.type === 'pan' ? 'grabbing' : 'default',
          backgroundColor: 'var(--bg)',
          backgroundImage: 'radial-gradient(var(--grid-dot) 1.4px, transparent 1.4px)',
          backgroundSize: `${22 * zoom}px ${22 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}>
          {/* palette */}
          <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 5, display: 'flex', gap: 6, background: 'var(--surface)',
            padding: 6, borderRadius: 11, border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }} onPointerDown={e => e.stopPropagation()}>
            {Object.entries(NODE_META).map(([t, m]) => (
              <button key={t} onClick={() => addNode(t)} title={'Add ' + m.label} className="mono" style={{
                display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--line)', background: 'var(--surface-2)',
                borderRadius: 8, padding: '6px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>
                <span style={{ width: 15, height: 15, display: 'flex', color: m.color }}>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
          {/* zoom */}
          <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 5, display: 'flex', gap: 4, background: 'var(--surface)',
            padding: 5, borderRadius: 10, border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }} onPointerDown={e => e.stopPropagation()}>
            <Btn sm icon={<span style={{ fontWeight: 700 }}>−</span>} onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} />
            <button onClick={() => { setZoom(1); setPan({ x: 20, y: 10 }); }} className="mono" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, width: 46, color: 'var(--ink-soft)' }}>{Math.round(zoom * 100)}%</button>
            <Btn sm icon={<span style={{ fontWeight: 700 }}>+</span>} onClick={() => setZoom(z => Math.min(1.8, +(z + 0.1).toFixed(2)))} />
          </div>

          <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            {/* edges */}
            <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none', left: 0, top: 0 }}>
              {edges.map((e, i) => {
                const a = nodes.find(n => n.id === e.from), b = nodes.find(n => n.id === e.to);
                if (!a || !b) return null;
                const active = sel === e.from || sel === e.to;
                return <g key={i}>
                  <path d={edgePath(a, b)} fill="none" stroke={active ? 'var(--primary)' : 'var(--line-2)'} strokeWidth={active ? 2.4 : 1.8} />
                  <circle cx={port(b, 'in').x} cy={port(b, 'in').y} r="3.4" fill={active ? 'var(--primary)' : 'var(--line-2)'} />
                </g>;
              })}
              {conn && (() => { const a = nodes.find(n => n.id === conn.from); const s = port(a, 'out');
                return <path d={`M ${s.x} ${s.y} C ${s.x + 50} ${s.y}, ${conn.x - 50} ${conn.y}, ${conn.x} ${conn.y}`} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeDasharray="5 4" />; })()}
            </svg>
            {/* nodes */}
            {nodes.map(n => {
              const m = NODE_META[n.type]; const on = sel === n.id;
              return (
                <div key={n.id} data-node={n.id} onPointerDown={e => startNodeDrag(e, n)}
                  style={{ position: 'absolute', left: n.x, top: n.y, width: NODE_W, minHeight: NODE_H,
                    background: 'var(--surface)', borderRadius: 13, cursor: 'grab',
                    border: `1.5px solid ${on ? m.color : 'var(--line)'}`,
                    boxShadow: on ? `0 0 0 3px ${m.line}, var(--shadow-md)` : 'var(--shadow)', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 8px' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: m.tint, color: m.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 26px' }}>
                      <span style={{ width: 16, height: 16, display: 'flex' }}>{m.icon}</span></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 8.5, color: m.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{m.label}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 650, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.label}</div>
                    </div>
                  </div>
                  {n.fields.length > 0 && (
                    <div style={{ padding: '0 12px 9px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {n.fields.slice(0, 2).map(([k, v], i) => (
                        <div key={i} className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)', display: 'flex', gap: 5, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--ink-soft)' }}>{k}</span><span style={{ opacity: .6 }}>{String(v)}</span></div>
                      ))}
                      {n.fields.length > 2 && <div className="mono" style={{ fontSize: 9, color: 'var(--ink-faint)', opacity: .6 }}>+{n.fields.length - 2} more</div>}
                    </div>
                  )}
                  {/* out port */}
                  <div onPointerDown={e => startConn(e, n)} title="Drag to connect" style={{
                    position: 'absolute', right: -7, top: NODE_H / 2 - 7, width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--surface)', border: `2px solid ${m.color}`, cursor: 'crosshair', zIndex: 2 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* inspector */}
        <div style={{ width: 296, flex: '0 0 296px', borderLeft: '1px solid var(--line)', background: 'var(--rail)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--rail-line)' }}>
            <Segmented options={[{ value: 'inspect', label: 'Inspect' }, { value: 'prototype', label: 'Prototype' }]} value={tab} onChange={setTab} />
          </div>
          <div className="scroll" style={{ flex: 1, padding: 16 }}>
            {tab === 'inspect' && (selNode ? <NodeInspector node={selNode}
              onChange={patch => setNodes(ns => ns.map(n => n.id === selNode.id ? { ...n, ...patch } : n))}
              onDelete={() => delNode(selNode.id)} /> :
              <div className="muted" style={{ textAlign: 'center', padding: '40px 10px', fontSize: 13 }}>
                <div style={{ width: 30, height: 30, margin: '0 auto 12px', display: 'flex', color: 'var(--ink-faint)', opacity: .5 }}>{I.arch}</div>
                Select a node to edit its schema, connection rules and config.</div>)}
            {tab === 'prototype' && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Generated mock payload</div>
                <p className="softline" style={{ fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>Derived from the node relationships you drew. Updates as you connect nodes.</p>
                <pre className="mono" style={{ margin: 0, fontSize: 11, lineHeight: 1.65, background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 11, padding: 13, overflow: 'auto', color: 'var(--ink)' }}>{JSON.stringify(mockPayload(), null, 2)}</pre>
                <Btn kind="soft" sm icon={I.copy} onClick={() => copyJSON(mockPayload(), 'mock payload')} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>Copy mock payload</Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function NodeInspector({ node, onChange, onDelete }) {
  const m = NODE_META[node.type];
  const setField = (i, idx, val) => onChange({ fields: node.fields.map((f, j) => j === i ? (idx === 0 ? [val, f[1]] : [f[0], val]) : f) });
  return (
    <div className="fadein">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: m.tint, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 19, height: 19, display: 'flex' }}>{m.icon}</span></span>
        <div className="mono" style={{ fontSize: 10, color: m.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{m.label}</div>
        <Btn icon={I.trash} sm onClick={onDelete} style={{ marginLeft: 'auto' }} title="Delete node" />
      </div>

      <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Label</label>
      <input className="input" value={node.label} onChange={e => onChange({ label: e.target.value })} style={{ marginBottom: 16 }} />

      <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Type</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {Object.entries(NODE_META).map(([t, mm]) => (
          <button key={t} onClick={() => onChange({ type: t })} title={mm.label} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'center',
            border: `1.5px solid ${node.type === t ? mm.color : 'var(--line)'}`, background: node.type === t ? mm.tint : 'var(--surface)', color: mm.color }}>
            <span style={{ width: 16, height: 16, display: 'flex' }}>{mm.icon}</span></button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span className="eyebrow">Schema / config</span>
        <button onClick={() => onChange({ fields: [...node.fields, ['key', 'value']] })} className="mono"
          style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, display: 'flex' }}>{I.plus}</span>add</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {node.fields.length === 0 && <div className="muted mono" style={{ fontSize: 11, padding: '8px 0' }}>No fields yet.</div>}
        {node.fields.map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input className="input mono" value={k} onChange={e => setField(i, 0, e.target.value)} style={{ fontSize: 11, padding: '7px 9px', flex: '0 0 40%' }} />
            <input className="input mono" value={v} onChange={e => setField(i, 1, e.target.value)} style={{ fontSize: 11, padding: '7px 9px', flex: 1 }} />
            <button onClick={() => onChange({ fields: node.fields.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', width: 20, flex: '0 0 20px' }}>
              <span style={{ width: 12, height: 12, display: 'flex' }}>{I.x}</span></button>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ArchWS = ArchWS;
