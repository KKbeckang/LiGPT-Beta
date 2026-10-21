// The knowledge graph the extraction pipeline writes, built from the real records and laid out
// once with d3-force. Every node gets the time (scene seconds) at which it is "written".
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import records from '../data/records.json';
import { graphName } from '../lib/electrolyte';

export const INSERT_START = 1.4;
export const INSERT_END = 10.4;
export const QUERY = { salt: 'LiFSI', solvent: 'DME' };

export const radius = (n) => (n.kind === 'e' ? 3.6 : n.kind === 'ref' ? 2.3 : 5 + Math.sqrt(n.degree) * 2.2);

export function buildGraph() {
  const papers = [...new Set(records.map((r) => r.ref))].sort((a, b) => a - b);
  const step = (INSERT_END - INSERT_START) / papers.length;
  const nodes = [];
  const links = [];
  const hubs = new Map();
  const events = [];

  const hub = (kind, name, t) => {
    const id = `${kind}:${name}`;
    let n = hubs.get(id);
    if (!n) {
      n = { id, kind, name, t, degree: 0 };
      hubs.set(id, n);
      nodes.push(n);
    }
    n.t = Math.min(n.t, t);
    n.degree++;
    return n;
  };

  papers.forEach((ref, p) => {
    const tp = INSERT_START + p * step;
    const refNode = { id: `ref:${ref}`, kind: 'ref', ref, t: tp, degree: 0 };
    nodes.push(refNode);
    records
      .filter((r) => r.ref === ref)
      .forEach((r, j) => {
        const t = tp + j * 0.045;
        const e = { id: `e:${nodes.length}`, kind: 'e', ce: r.ce, ref, t, record: r, name: graphName(r) };
        nodes.push(e);
        links.push({ source: e, target: refNode, kind: 'ref', t });
        for (const s of r.salts) links.push({ source: e, target: hub('salt', s.name, t - 0.05), kind: 'salt', t });
        for (const s of r.solvents) links.push({ source: e, target: hub('solvent', s.name, t - 0.05), kind: 'solvent', t });
        refNode.degree++;
        events.push(e);
      });
  });

  // Deterministic initial positions: a sunflower spiral.
  nodes.forEach((n, i) => {
    const r = 9 * Math.sqrt(i + 0.5);
    const a = i * 2.39996;
    n.x = r * Math.cos(a);
    n.y = r * Math.sin(a);
  });
  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).distance((l) => (l.kind === 'ref' ? 16 : 78)).strength((l) => (l.kind === 'ref' ? 0.9 : 0.3)))
    .force('charge', forceManyBody().strength((n) => (n.kind === 'e' ? -22 : n.kind === 'ref' ? -8 : -320)))
    .force('collide', forceCollide((n) => radius(n) + 2))
    .force('x', forceX(0).strength(0.045))
    .force('y', forceY(0).strength(0.07))
    .stop();
  for (let i = 0; i < 420; i++) sim.tick();

  // Normalise to a box centred on 0,0 that is 1240 wide or 860 tall.
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const scale = Math.min(1240 / (Math.max(...xs) - Math.min(...xs)), 860 / (Math.max(...ys) - Math.min(...ys)));
  for (const n of nodes) {
    n.x = (n.x - cx) * scale;
    n.y = (n.y - cy) * scale;
  }

  events.sort((a, b) => a.t - b.t);
  const matches = events.filter(
    (e) => e.ce != null && e.record.salts.some((s) => s.name === QUERY.salt) && e.record.solvents.some((s) => s.name === QUERY.solvent),
  );
  let best = -Infinity;
  const changes = [];
  for (const m of matches) {
    if (m.ce > best) {
      best = m.ce;
      changes.push(m);
    }
  }

  return {
    nodes,
    links,
    events,
    matches,
    changes,
    papers: papers.length,
    hubs: [...hubs.values()],
    focus: [hubs.get(`salt:${QUERY.salt}`), hubs.get(`solvent:${QUERY.solvent}`)],
  };
}
