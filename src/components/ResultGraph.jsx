import { useMemo, useState } from 'react';
import { findRecord, PAPERS, paperShort } from '../lib/data';
import { formatCE, formatElectrolyte, parseGraphName } from '../lib/electrolyte';
import { layoutGraph } from '../lib/graph';
import { clamp, easeOutBack, easeOutCubic, progress } from '../lib/motion';
import { GraphIcon } from './Icons';

const W = 1320;
const H = 460;

const NODE = {
  Electrolyte: { fill: 'url(#rg-electrolyte)', stroke: '#2DD4BF', text: '#ECFEFF' },
  Salt: { fill: '#F59E0B', stroke: '#FDE68A', text: '#1F1300' },
  Solvent: { fill: '#0EA5E9', stroke: '#BAE6FD', text: '#03121C' },
  Reference: { fill: '#334155', stroke: '#64748B', text: '#E2E8F0' },
  Cited: { fill: '#6D28D9', stroke: '#C4B5FD', text: '#F5F3FF' },
};
const LINK = { MOL_L: '#F59E0B', VOLUME: '#38BDF8', CITED: '#94A3B8' };

function linkLabel(l) {
  if (l.type === 'MOL_L') return l.value ? `MOL_L · ${+l.value} M` : 'MOL_L';
  if (l.type === 'VOLUME') {
    if (!l.value) return 'VOLUME';
    return `VOLUME · ${l.value <= 1 ? Math.round(l.value * 100) : +l.value} %`;
  }
  return l.type;
}

const unit = (x, y) => {
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};

// Curved edge from rim to rim. Each side and depth of curve is tried and the one that keeps
// furthest from the other nodes wins, so an edge never seems to pass through a node on its way.
// The label sits at t = 0.4, nearer the electrolyte end, where neighbouring edges are still apart.
const bezier = (t, p0, p1, p2) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

function curve(a, b, cx, cy) {
  const [sx, sy] = unit(cx - a.x, cy - a.y);
  const [ex, ey] = unit(b.x - cx, b.y - cy);
  return { x1: a.x + sx * a.r, y1: a.y + sy * a.r, cx, cy, x2: b.x - ex * (b.r + 5), y2: b.y - ey * (b.r + 5) };
}

function clearance(c, a, b, nodes) {
  let best = Infinity;
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const x = bezier(t, c.x1, c.cx, c.x2);
    const y = bezier(t, c.y1, c.cy, c.y2);
    for (const n of nodes) {
      if (n !== a && n !== b) best = Math.min(best, Math.hypot(x - n.x, y - n.y) - n.r);
    }
  }
  return best;
}

function edge(l, nodes) {
  const { source: a, target: b } = l;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const chord = Math.hypot(dx, dy) || 1;
  const options = l.type === 'CITED' ? [0] : [0.08, -0.08, 0.2, -0.2];
  let c = null;
  let score = -Infinity;
  for (const f of options) {
    const bend = Math.min(90, chord * Math.abs(f)) * Math.sign(f);
    const candidate = curve(a, b, (a.x + b.x) / 2 - (dy / chord) * bend, (a.y + b.y) / 2 + (dx / chord) * bend);
    // Deeper curves only win when they clear the other nodes by a clear margin.
    const s = Math.min(clearance(candidate, a, b, nodes), 40) - Math.abs(f) * 20;
    if (s > score) {
      score = s;
      c = candidate;
    }
  }
  const t = 0.4;
  const tx = 2 * (1 - t) * (c.cx - c.x1) + 2 * t * (c.x2 - c.cx);
  const ty = 2 * (1 - t) * (c.cy - c.y1) + 2 * t * (c.y2 - c.cy);
  let angle = (Math.atan2(ty, tx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  const length = (Math.hypot(c.cx - c.x1, c.cy - c.y1) + Math.hypot(c.x2 - c.cx, c.y2 - c.cy) + Math.hypot(c.x2 - c.x1, c.y2 - c.y1)) / 2;
  return {
    d: `M${c.x1} ${c.y1} Q${c.cx} ${c.cy} ${c.x2} ${c.y2}`,
    mx: bezier(t, c.x1, c.cx, c.x2),
    my: bezier(t, c.y1, c.cy, c.y2),
    angle,
    length,
  };
}

// Which edge labels fit: a label is kept only if it overlaps no node, no electrolyte name and no
// label kept before it. The others still appear when the reader hovers one of the edge's nodes.
function placeLabels(edges, links, nodes) {
  const boxes = nodes.flatMap((n) => {
    const own = [{ x: n.x - n.r - 4, y: n.y - n.r - 4, w: 2 * n.r + 8, h: 2 * n.r + 8 }];
    if (n.label === 'Electrolyte') {
      const w = formatElectrolyte(parseGraphName(n.name)).length * 7.4;
      own.push({ x: n.x - w / 2, y: n.y + n.r + 6, w, h: 19 });
    }
    return own;
  });
  const hits = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  return edges.map((e, i) => {
    if (e.length < 120) return false;
    const rad = (e.angle * Math.PI) / 180;
    const w0 = linkLabel(links[i]).length * 6.2 + 8;
    const w = Math.abs(w0 * Math.cos(rad)) + Math.abs(14 * Math.sin(rad));
    const h = Math.abs(w0 * Math.sin(rad)) + Math.abs(14 * Math.cos(rad));
    const box = { x: e.mx - w / 2, y: e.my - 5 - h / 2, w, h };
    if (boxes.some((b) => hits(box, b))) return false;
    boxes.push(box);
    return true;
  });
}

function NodeCaption({ node, style }) {
  if (node.label === 'Electrolyte') {
    return (
      <text textAnchor="middle" y="5" fontSize="13" fontWeight="700" fill={style.text} fontFamily="JetBrains Mono, monospace">
        {node.ce == null ? '—' : +node.ce.toFixed(2)}
      </text>
    );
  }
  if (node.label === 'Reference') {
    return (
      <text textAnchor="middle" fill={style.text} fontFamily="JetBrains Mono, monospace">
        <tspan x="0" y="-3" fontSize="8" opacity="0.8">REF</tspan>
        <tspan x="0" y="10" fontSize="12" fontWeight="700">{node.ref}</tspan>
      </text>
    );
  }
  const size = node.name.length > 6 ? 9.5 : node.name.length > 4 ? 11 : 12.5;
  return (
    <text textAnchor="middle" y={size * 0.36} fontSize={size} fontWeight="700" fill={style.text} fontFamily="JetBrains Mono, monospace">
      {node.name}
    </text>
  );
}

// What a click on a node opens: an electrolyte's record (or its paper), or a paper.
function openTarget(n, ref) {
  if (n.label === 'Reference') return { type: 'paper', ref: n.ref };
  if (n.label !== 'Electrolyte' || ref == null) return null;
  const record = findRecord({ name: n.name, ce: n.ce, ref });
  return record ? { type: 'record', id: record.id } : { type: 'paper', ref };
}

// citedRefs: papers the LLM answer quoted; confirmed: "ref|ce" keys of graph facts found in those passages.
export function ResultGraph({ graph, progress: p = 1, highlight = 1, citedRefs, confirmed, interactive = true, onOpen }) {
  const layout = useMemo(() => layoutGraph(graph, W, H), [graph]);
  const edges = useMemo(() => layout.links.map((l) => edge(l, layout.nodes)), [layout]);
  const labelFits = useMemo(() => placeLabels(edges, layout.links, layout.nodes), [edges, layout]);
  const [hover, setHover] = useState(null);
  const neighbours = useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    for (const l of layout.links) {
      if (l.source.id === hover) set.add(l.target.id);
      if (l.target.id === hover) set.add(l.source.id);
    }
    return set;
  }, [hover, layout]);

  const order = { Electrolyte: [], Salt: [], Solvent: [], Reference: [] };
  for (const n of layout.nodes) (order[n.label] || (order[n.label] = [])).push(n.id);
  const appear = (n) => {
    const i = order[n.label].indexOf(n.id);
    if (n.label === 'Electrolyte') return progress(p, 0.02 + i * 0.06, 0.3 + i * 0.06);
    if (n.label === 'Reference') return progress(p, 0.55 + i * 0.04, 0.8 + i * 0.04);
    return progress(p, 0.3 + i * 0.03, 0.55 + i * 0.03);
  };
  const refOf = (e) => layout.links.find((l) => l.source.id === e.id && l.type === 'CITED')?.target.ref;
  const dim = (id) => (neighbours && !neighbours.has(id) ? 0.22 : 1);
  const glow = easeOutCubic(clamp(highlight));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none">
      <defs>
        <radialGradient id="rg-electrolyte" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#5EEAD4" />
          <stop offset="0.6" stopColor="#0F766E" />
          <stop offset="1" stopColor="#134E4A" />
        </radialGradient>
        {Object.entries(LINK).map(([type, color]) => (
          <marker key={type} id={`rg-arrow-${type}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={color} />
          </marker>
        ))}
      </defs>

      {layout.links.map((l, j) => {
        const k = easeOutCubic(progress(p, 0.25 + j * 0.012, 0.55 + j * 0.012));
        if (k <= 0) return null;
        const e = edges[j];
        const color = LINK[l.type] || '#94A3B8';
        const faded = neighbours && !(neighbours.has(l.source.id) && neighbours.has(l.target.id));
        return (
          <g key={j} opacity={faded ? 0.15 : 1}>
            <path
              d={e.d}
              fill="none"
              stroke={color}
              strokeOpacity="0.55"
              strokeWidth="1.6"
              strokeDasharray={e.length}
              strokeDashoffset={e.length * (1 - k)}
              markerEnd={k > 0.98 ? `url(#rg-arrow-${l.type})` : undefined}
            />
            {k > 0.98 && (labelFits[j] || (neighbours?.has(l.source.id) && neighbours?.has(l.target.id))) && (
              <text
                x={e.mx}
                y={e.my - 5}
                textAnchor="middle"
                fontSize="10"
                fill={color}
                fontFamily="JetBrains Mono, monospace"
                transform={`rotate(${e.angle} ${e.mx} ${e.my - 5})`}
                paintOrder="stroke"
                stroke="#0A0D14"
                strokeWidth="4"
              >
                {linkLabel(l)}
              </text>
            )}
          </g>
        );
      })}

      {layout.nodes.map((n) => {
        const k = appear(n);
        if (k <= 0) return null;
        const cited = n.label === 'Reference' && citedRefs?.has(n.ref);
        const style = cited && glow > 0 ? NODE.Cited : NODE[n.label] || NODE.Reference;
        const isConfirmed = n.label === 'Electrolyte' && confirmed?.has(`${refOf(n)}|${n.ce}`);
        const label = n.label === 'Electrolyte' ? formatElectrolyte(parseGraphName(n.name)) : null;
        const target = interactive && onOpen ? openTarget(n, refOf(n)) : null;
        return (
          <g
            key={n.id}
            transform={`translate(${n.x} ${n.y}) scale(${easeOutBack(k)})`}
            opacity={clamp(k * 1.4) * dim(n.id)}
            onMouseEnter={interactive ? () => setHover(n.id) : undefined}
            onMouseLeave={interactive ? () => setHover(null) : undefined}
            onClick={target ? () => onOpen(target) : undefined}
            style={interactive ? { cursor: target ? 'pointer' : 'default' } : undefined}
          >
            <title>
              {n.label === 'Electrolyte'
                ? `${n.name.trim()} · CE ${formatCE(n.ce)}`
                : n.label === 'Reference'
                  ? `Ref. ${n.ref} · ${n.title || PAPERS.get(n.ref)?.title || paperShort(n.ref)}`
                  : `${n.label} · ${n.name}`}
            </title>
            {(n.label === 'Electrolyte' || cited) && <circle r={n.r + 10} fill={cited ? '#8B5CF6' : '#2DD4BF'} opacity={cited ? 0.28 * glow : 0.14} />}
            <circle r={n.r} fill={style.fill} stroke={style.stroke} strokeWidth="1.6" />
            <NodeCaption node={n} style={style} />
            {isConfirmed && glow > 0 && (
              <g transform={`translate(${n.r * 0.72} ${-n.r * 0.72})`} opacity={glow}>
                <circle r="9" fill="#0A0D14" stroke="#2DD4BF" strokeWidth="1.4" />
                <path d="M-4 0.5 l2.8 2.8 L4.5 -3.2" fill="none" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
            {label && (
              <text y={n.r + 21} textAnchor="middle" fontSize="13.5" fill="#E8ECF3" fontFamily="Inter Variable, Inter, sans-serif" paintOrder="stroke" stroke="#0A0D14" strokeWidth="4">
                {label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const SOURCE_TEXT = {
  neo4j: (g) => `Read from Neo4j · ${g.nodes.length} nodes · ${g.links.length} relationships`,
  demo: () => 'Demo · built from the extracted records in the graph’s schema',
  derived: () => 'Built from the result rows (the server returned no graph)',
};

function Legend({ color, ring, children }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }} />
      {children}
    </span>
  );
}

export function ResultGraphSection({ graph, style, ...props }) {
  return (
    <section style={style} className="glass relative overflow-hidden rounded-[20px]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-kg/60 to-transparent" />
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-kg/10 text-kg">
          <GraphIcon />
        </span>
        <div className="leading-tight">
          <div className="text-[15.5px] font-semibold text-ink-100">Result graph</div>
          <div className="text-[13px] text-ink-400">{(SOURCE_TEXT[graph.source] || SOURCE_TEXT.derived)(graph)}</div>
        </div>
        <div className="ml-auto flex items-center gap-4 font-mono text-[12px] text-ink-400">
          <Legend color="#14B8A6">electrolyte · CE %</Legend>
          <Legend color="#F59E0B">salt</Legend>
          <Legend color="#0EA5E9">solvent</Legend>
          <Legend color="#334155">paper</Legend>
          <Legend color="#6D28D9" ring="rgba(139,92,246,0.35)">quoted by the LLM answer</Legend>
        </div>
      </header>
      <div className="px-3 pb-2 pt-1">
        <ResultGraph graph={graph} {...props} />
      </div>
    </section>
  );
}
