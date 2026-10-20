import { useMemo } from 'react';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { easeOutBack, easeOutCubic, progress as between } from '../lib/motion';

const PAD = 16;

// Electrolyte nodes linked to their salt and solvent nodes, laid out once with a fixed number of ticks
// so the picture is the same on every render.
function buildLayout(rows, width, height) {
  const nodes = [];
  const links = [];
  const byId = new Map();
  const add = (node) => {
    if (!byId.has(node.id)) {
      byId.set(node.id, node);
      nodes.push(node);
    }
    return byId.get(node.id);
  };
  rows.forEach((row, i) => {
    const e = add({ id: `e${i}`, kind: 'electrolyte', ce: row.ce, r: 13, order: i });
    for (const s of row.salts || []) links.push({ source: e.id, target: add({ id: `salt:${s.name}`, kind: 'salt', label: s.name, r: 6 }).id });
    for (const s of row.solvents || []) links.push({ source: e.id, target: add({ id: `solvent:${s.name}`, kind: 'solvent', label: s.name, r: 5 }).id });
  });
  for (const node of nodes) {
    node.degree = links.filter((l) => l.source === node.id || l.target === node.id).length;
    if (node.kind !== 'electrolyte') node.r += Math.min(4, node.degree - 1);
  }
  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).id((d) => d.id).distance(38).strength(0.8))
    .force('charge', forceManyBody().strength(-130))
    .force('collide', forceCollide((d) => d.r + 9))
    .force('x', forceX(width / 2).strength(0.07))
    .force('y', forceY(height / 2).strength(0.12))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();
  // Fit into the box.
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(1, (width - 2 * PAD) / Math.max(1, maxX - minX), (height - 2 * PAD - 10) / Math.max(1, maxY - minY));
  for (const n of nodes) {
    n.x = width / 2 + (n.x - (minX + maxX) / 2) * scale;
    n.y = (height - 10) / 2 + (n.y - (minY + maxY) / 2) * scale;
  }
  return { nodes, links: links.map((l) => ({ source: byId.get(l.source.id || l.source), target: byId.get(l.target.id || l.target) })) };
}

export function Subgraph({ rows, progress = 1, width = 220, height = 190 }) {
  const layout = useMemo(() => buildLayout(rows, width, height), [rows, width, height]);
  if (!rows.length) return null;
  const components = layout.nodes.filter((n) => n.kind !== 'electrolyte');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <radialGradient id="sg-e" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#2DD4BF" stopOpacity="0.38" />
          <stop offset="1" stopColor="#2DD4BF" stopOpacity="0.08" />
        </radialGradient>
      </defs>
      {layout.links.map((l, i) => {
        const k = easeOutCubic(between(progress, 0.15 + (l.source.order || 0) * 0.08, 0.55 + (l.source.order || 0) * 0.08));
        const x2 = l.source.x + (l.target.x - l.source.x) * k;
        const y2 = l.source.y + (l.target.y - l.source.y) * k;
        return <line key={i} x1={l.source.x} y1={l.source.y} x2={x2} y2={y2} stroke="rgba(148,163,184,0.35)" strokeWidth="1" opacity={k > 0 ? 1 : 0} />;
      })}
      {components.map((n, i) => {
        const k = between(progress, 0.3 + i * 0.04, 0.6 + i * 0.04);
        const color = n.kind === 'salt' ? '#FBBF24' : '#38BDF8';
        return (
          <g key={n.id} transform={`translate(${n.x} ${n.y}) scale(${easeOutBack(k)})`} opacity={k}>
            <circle r={n.r + 4} fill={color} opacity="0.12" />
            <circle r={n.r} fill={color} opacity="0.9" />
            <text y={n.r + 11} textAnchor="middle" fontSize="9.5" fill="#C9D0DC" fontFamily="JetBrains Mono, monospace">
              {n.label}
            </text>
          </g>
        );
      })}
      {layout.nodes
        .filter((n) => n.kind === 'electrolyte')
        .map((n) => {
          const k = between(progress, 0.05 + n.order * 0.08, 0.4 + n.order * 0.08);
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y}) scale(${easeOutBack(k)})`} opacity={k}>
              <circle r={n.r} fill="url(#sg-e)" stroke="#2DD4BF" strokeWidth="1.2" />
              <text y="3" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#E8ECF3" fontFamily="JetBrains Mono, monospace">
                {n.ce == null ? '—' : n.ce.toFixed(1)}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
