// Result graphs: { nodes: [{id, label, ...}], links: [{source, target, type, value}], source }.
// label is the Neo4j label (Electrolyte, Salt, Solvent, Reference); source says where the graph came from.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';

// The same shape the server reads from Neo4j, built from result rows (demo mode, or an older server).
export function graphFromRows(rows, source) {
  const nodes = [];
  const links = [];
  const seen = new Set();
  const add = (node) => {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      nodes.push(node);
    }
  };
  rows.forEach((row, i) => {
    const id = `e:${i}`;
    add({ id, label: 'Electrolyte', name: row.name, ce: row.ce });
    for (const s of row.salts || []) {
      add({ id: `salt:${s.name}`, label: 'Salt', name: s.name });
      links.push({ source: id, target: `salt:${s.name}`, type: 'MOL_L', value: s.mol ?? null });
    }
    for (const s of row.solvents || []) {
      add({ id: `solvent:${s.name}`, label: 'Solvent', name: s.name });
      links.push({ source: id, target: `solvent:${s.name}`, type: 'VOLUME', value: s.frac ?? null });
    }
    if (row.ref != null) {
      add({ id: `ref:${row.ref}`, label: 'Reference', ref: row.ref, title: null });
      links.push({ source: id, target: `ref:${row.ref}`, type: 'CITED', value: null });
    }
  });
  return { nodes, links, source };
}

export const isGraph = (g) => Boolean(g && Array.isArray(g.nodes) && Array.isArray(g.links) && g.nodes.length);

export const NODE_RADIUS = { Electrolyte: 30, Salt: 24, Solvent: 22, Reference: 19 };

// Target position (fractions of the box) for every node: salts in a left column, electrolytes
// across the middle in result order (alternately higher and lower so their names don't collide),
// solvents in a right column ordered by the electrolytes they belong to, papers under the
// electrolytes that cite them.
function anchors(graph) {
  const byLabel = (label) => graph.nodes.filter((n) => n.label === label);
  const spread = (i, count, from, to) => (count <= 1 ? (from + to) / 2 : from + ((to - from) * i) / (count - 1));
  const electrolytes = byLabel('Electrolyte');
  const anchor = new Map();
  electrolytes.forEach((n, i) => anchor.set(n.id, [spread(i, electrolytes.length, 0.3, 0.7), i % 2 ? 0.52 : 0.3]));
  const meanX = (n) => {
    const xs = graph.links.filter((l) => l.target === n.id && anchor.has(l.source)).map((l) => anchor.get(l.source)[0]);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5;
  };
  // Long columns zigzag so neighbouring nodes keep their distance.
  const column = (label, x, from, to) => {
    const nodes = byLabel(label).sort((a, b) => meanX(a) - meanX(b));
    const zig = nodes.length > 4 ? 0.028 : 0;
    nodes.forEach((n, i) => anchor.set(n.id, [x + (i % 2 ? zig : -zig), spread(i, nodes.length, from, to)]));
  };
  column('Salt', 0.09, 0.28, 0.62);
  column('Solvent', 0.9, 0.08, 0.84);
  byLabel('Reference').forEach((n) => anchor.set(n.id, [meanX(n), 0.86]));
  return anchor;
}

// Positions in a width × height box. The anchors do most of the work; a short, fixed simulation
// only pushes overlapping nodes apart, so the same graph always gets the same picture.
export function layoutGraph(graph, width, height, pad = 40) {
  const anchor = anchors(graph);
  const nodes = graph.nodes.map((n) => {
    const [ax, ay] = anchor.get(n.id) || [0.5, 0.5];
    return { ...n, r: NODE_RADIUS[n.label] || 20, ax: ax * width, ay: ay * height, x: ax * width, y: ay * height };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = graph.links.filter((l) => byId.has(l.source) && byId.has(l.target)).map((l) => ({ ...l }));
  forceSimulation(nodes)
    .force('link', forceLink(links).id((d) => d.id).distance(120).strength(0.02))
    .force('charge', forceManyBody().strength(-120))
    .force('collide', forceCollide((d) => d.r + (d.label === 'Electrolyte' ? 26 : 12)).strength(1))
    .force('x', forceX((d) => d.ax).strength(0.5))
    .force('y', forceY((d) => d.ay).strength(0.5))
    .stop()
    .tick(300);
  for (const n of nodes) {
    n.x = Math.min(width - pad - n.r, Math.max(pad + n.r, n.x));
    n.y = Math.min(height - pad - n.r - (n.label === 'Electrolyte' ? 24 : 0), Math.max(pad + n.r, n.y));
  }
  return { nodes, links: links.map((l) => ({ ...l, source: byId.get(l.source.id), target: byId.get(l.target.id) })), byId };
}
