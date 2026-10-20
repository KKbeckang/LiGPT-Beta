import { useMemo } from 'react';
import { clamp, easeInOutCubic, easeOutBack, easeOutCubic, lerp, progress } from '../../lib/motion';
import { buildGraph, INSERT_END, QUERY, radius } from '../graphData';
import { Caption, SectionTitle } from '../parts';

const CENTER = { x: 690, y: 640 };
const BASE_SCALE = 0.94;
const FOCUS_IN = [10.8, 12.0];
const FOCUS_OUT = [15.6, 16.8];

const KIND_COLOR = { salt: '#FBBF24', solvent: '#38BDF8', ref: '#64748B' };
const LINK_COLOR = { salt: 'rgba(251,191,36,0.22)', solvent: 'rgba(56,189,248,0.2)', ref: 'rgba(148,163,184,0.16)' };

// Electrolyte colour: dim teal for low CE, bright mint for CE near 100 %.
function ceColor(ce) {
  if (ce == null) return '#475569';
  const k = clamp((ce - 80) / 19.5);
  const from = [15, 118, 110];
  const to = [153, 246, 228];
  return `rgb(${from.map((c, i) => Math.round(lerp(c, to[i], k))).join(',')})`;
}

function camera(l, focus) {
  const zIn = 1.18 - 0.18 * easeOutCubic(progress(l, 0, INSERT_END));
  const kIn = easeInOutCubic(progress(l, ...FOCUS_IN));
  const kOut = easeInOutCubic(progress(l, ...FOCUS_OUT));
  const k = kIn * (1 - kOut);
  const zoom = lerp(zIn, 2.1, k) * (1 + 0.04 * progress(l, FOCUS_OUT[1], 19.6));
  return { x: focus.x * k, y: focus.y * k, scale: BASE_SCALE * zoom, zoom };
}

function Counter({ label, value }) {
  return (
    <div>
      <div className="font-mono text-[30px] font-medium leading-none text-ink-100">{value}</div>
      <div className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
    </div>
  );
}

function WriteLog({ l, graph }) {
  const written = graph.events.filter((e) => e.t <= l);
  const papers = graph.nodes.filter((n) => n.kind === 'ref' && n.t <= l).length;
  const nodes = graph.nodes.filter((n) => n.t <= l).length;
  const rels = graph.links.filter((x) => x.t <= l).length;
  const last = written.slice(-5);
  return (
    <div className="glass rounded-[20px] p-5">
      <div className="flex items-center justify-between font-mono text-[12.5px] uppercase tracking-[0.14em] text-ink-400">
        <span>Write stream · build_kg</span>
        <span className="flex items-center gap-2 text-kg">
          <span className="h-2 w-2 rounded-full bg-kg" style={{ opacity: l < INSERT_END ? 0.5 + 0.5 * Math.sin(l * 8) : 0.35 }} />
          {l < INSERT_END ? 'writing' : 'idle'}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Counter label={`papers / ${graph.papers}`} value={papers} />
        <Counter label="nodes" value={nodes} />
        <Counter label="relationships" value={rels} />
      </div>
      <div className="mt-4 h-[262px] space-y-1.5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/35 p-3 font-mono text-[13px] leading-[1.45]">
        {last.map((e) => {
          const fresh = 1 - progress(l, e.t, e.t + 0.5);
          return (
            <div key={e.id} className="rounded-md px-2 py-1" style={{ background: `rgba(45,212,191,${0.14 * fresh})` }}>
              <div className="truncate">
                <span className="text-[#7DD3FC]">CREATE</span> <span className="text-ink-500">(</span>
                <span className="text-kg-soft">:Electrolyte</span> <span className="text-ink-500">{'{'}</span>
                <span className="text-ink-200">ce: </span>
                <span className="text-[#F0ABFC]">{e.ce ?? 'null'}</span>
                <span className="text-ink-500">{'})'}</span>
                <span className="text-ink-500">-[:CITED]-&gt;</span>
                <span className="text-ink-300">(Ref {e.ref})</span>
              </div>
              <div className="truncate pl-4 text-[12px] text-ink-500">name: &apos;{e.name || '—'}&apos;</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveQuery({ l, graph }) {
  const seen = graph.matches.filter((m) => m.t <= l);
  const changes = graph.changes.filter((c) => c.t <= l);
  const current = changes[changes.length - 1];
  const previous = changes[changes.length - 2];
  const kSwap = current ? easeOutCubic(progress(l, current.t, current.t + 0.45)) : 0;
  const flash = current ? 1 - progress(l, current.t, current.t + 1.4) : 0;
  return (
    <div
      className="glass mt-5 rounded-[20px] p-5"
      style={{ boxShadow: `0 0 0 1px rgba(45,212,191,${0.5 * flash}), 0 0 ${50 * flash}px rgba(45,212,191,${0.35 * flash}), 0 24px 64px -24px rgba(0,0,0,0.7)` }}
    >
      <div className="flex items-center justify-between font-mono text-[12.5px] uppercase tracking-[0.14em] text-ink-400">
        <span>Live query · re-runs on every write</span>
        {flash > 0 && previous && <span style={{ opacity: Math.min(1, flash * 2) }} className="text-kg">▲ answer changed</span>}
      </div>
      <pre className="mt-3 font-mono text-[13px] leading-[1.6] text-ink-200">
        <span className="text-[#7DD3FC]">MATCH</span> (e<span className="text-kg-soft">:Electrolyte</span>)-[<span className="text-kg-soft">:MOL_L</span>]-&gt;(<span className="text-kg-soft">:Salt</span> {'{'}name: <span className="text-salt">&apos;{QUERY.salt}&apos;</span>{'}'}){'\n'}
        <span className="text-[#7DD3FC]">MATCH</span> (e)-[<span className="text-kg-soft">:VOLUME</span>]-&gt;(<span className="text-kg-soft">:Solvent</span> {'{'}name: <span className="text-salt">&apos;{QUERY.solvent}&apos;</span>{'}'}){'\n'}
        <span className="text-[#7DD3FC]">RETURN</span> max(e.coulombic_efficiency) <span className="text-[#7DD3FC]">AS</span> best_ce
      </pre>
      <div className="mt-4 flex items-end gap-5">
        <div className="relative h-[66px] w-[210px] overflow-hidden">
          {previous && (
            <div className="absolute inset-0 font-mono text-[60px] font-medium leading-none text-ink-500" style={{ opacity: 1 - kSwap, transform: `translateY(${-kSwap * 50}px)` }}>
              {previous.ce}
              <span className="text-[30px]"> %</span>
            </div>
          )}
          <div className="absolute inset-0 font-mono text-[60px] font-medium leading-none text-kg-soft" style={{ opacity: current ? kSwap : 1, transform: `translateY(${current ? (1 - kSwap) * 50 : 0}px)` }}>
            {current ? current.ce : '—'}
            {current && <span className="text-[30px]"> %</span>}
          </div>
        </div>
        <div className="pb-1 text-[15px] leading-snug text-ink-400">
          best CE for {QUERY.salt} + {QUERY.solvent}
          <br />
          <span className="font-mono text-[13px] text-ink-500">
            {seen.length} matching fact{seen.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {graph.changes.map((c, i) => {
          const k = easeOutCubic(progress(l, c.t, c.t + 0.4));
          return (
            <div key={c.id} className="flex items-center gap-2" style={{ opacity: k }}>
              {i > 0 && <span className="text-ink-500">→</span>}
              <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[12.5px] ${c === current ? 'border-kg/40 bg-kg/10 text-kg-soft' : 'border-white/10 text-ink-400'}`}>
                Ref {c.ref} · {c.ce} %
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GraphScene({ t, dur }) {
  const l = t;
  const graph = useMemo(buildGraph, []);
  const [fs, fv] = graph.focus;
  const focus = { x: (fs.x + fv.x) / 2, y: (fs.y + fv.y) / 2 };
  const cam = camera(l, focus);
  const dim = easeInOutCubic(progress(l, FOCUS_IN[0], FOCUS_IN[0] + 0.8)) * (1 - easeInOutCubic(progress(l, FOCUS_OUT[0] - 0.2, FOCUS_OUT[0] + 0.6)));
  const highlighted = useMemo(() => new Set([...graph.matches.map((m) => m.id), fs.id, fv.id]), [graph, fs, fv]);
  // Only the facts that moved the answer get a value label, so the close-up stays readable.
  const labelled = useMemo(() => new Set(graph.changes.map((c) => c.id)), [graph]);
  const screen = (n) => ({ x: CENTER.x + (n.x - cam.x) * cam.scale, y: CENTER.y + (n.y - cam.y) * cam.scale });
  const rScale = 0.8 + 0.2 * cam.zoom;

  const first = graph.changes[0];
  const latest = graph.changes[graph.changes.length - 1];
  const nodeCount = graph.nodes.length;
  const relCount = graph.links.length;

  return (
    <div className="absolute inset-0">
      <svg width="1920" height="1080" className="absolute inset-0">
        <defs>
          <radialGradient id="hub-glow" r="50%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {graph.links.map((link, i) => {
          const k = easeOutCubic(progress(l, link.t, link.t + 0.35));
          if (k <= 0) return null;
          const a = screen(link.source);
          const b = screen(link.target);
          const lit = highlighted.has(link.source.id) && (link.target === fs || link.target === fv);
          const opacity = lit ? 1 : 1 - 0.85 * dim;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={a.x + (b.x - a.x) * k}
              y2={a.y + (b.y - a.y) * k}
              stroke={lit && dim > 0 ? 'rgba(126,232,216,0.75)' : LINK_COLOR[link.kind]}
              strokeWidth={lit && dim > 0 ? 1.6 : 1}
              opacity={opacity}
            />
          );
        })}
        {graph.nodes.map((n) => {
          const k = progress(l, n.t, n.t + 0.45);
          if (k <= 0) return null;
          const p = screen(n);
          const isHub = n.kind === 'salt' || n.kind === 'solvent';
          const r = radius(n) * rScale;
          const lit = highlighted.has(n.id);
          const opacity = lit ? 1 : 1 - 0.82 * dim;
          const ring = progress(l, n.t, n.t + 0.8);
          const color = n.kind === 'e' ? ceColor(n.ce) : KIND_COLOR[n.kind];
          return (
            <g key={n.id} transform={`translate(${p.x} ${p.y})`} opacity={opacity}>
              {n.kind === 'e' && ring < 1 && <circle r={r + 16 * ring} fill="none" stroke="#5EEAD4" strokeWidth="1.2" opacity={(1 - ring) * 0.7} />}
              {isHub && <circle r={r * 2.4} fill="url(#hub-glow)" opacity="0.5" />}
              <circle r={r * easeOutBack(k)} fill={color} stroke={isHub ? 'rgba(255,255,255,0.35)' : 'none'} strokeWidth="1" />
              {lit && dim > 0 && n.kind === 'e' && <circle r={r + 5} fill="none" stroke="#7EE8D8" strokeWidth="1.5" opacity={dim} />}
              {labelled.has(n.id) && dim > 0 && (
                <text
                  x={p.x < CENTER.x ? -r - 10 : r + 10}
                  y={5}
                  textAnchor={p.x < CENTER.x ? 'end' : 'start'}
                  fontSize="15" fontWeight="600" fill="#E8ECF3" opacity={dim} fontFamily="JetBrains Mono, monospace" paintOrder="stroke" stroke="#04060A" strokeWidth="5">
                  {n.ce} % · Ref {n.ref}
                </text>
              )}
            </g>
          );
        })}
        {graph.hubs
          .filter((n) => n.degree >= 7 || highlighted.has(n.id))
          .map((n) => {
            const k = easeOutCubic(progress(l, n.t + 0.2, n.t + 0.6));
            if (k <= 0) return null;
            const p = screen(n);
            const lit = highlighted.has(n.id);
            return (
              <text
                key={n.id}
                x={p.x}
                y={p.y - radius(n) * rScale - 8}
                textAnchor="middle"
                fontSize={lit && dim > 0 ? 19 : 15}
                fontWeight="600"
                fill={n.kind === 'salt' ? '#FDE68A' : '#BAE6FD'}
                opacity={k * (lit ? 1 : 1 - 0.85 * dim)}
                fontFamily="JetBrains Mono, monospace"
                paintOrder="stroke"
                stroke="#04060A"
                strokeWidth="5"
              >
                {n.name}
              </text>
            );
          })}
      </svg>

      <div className="absolute" style={{ textShadow: '0 2px 24px #04060A' }}>
        <SectionTitle k={progress(l, 0.2, 1.0)} index="02" eyebrow="Knowledge graph" title="Facts stream into Neo4j" />
      </div>
      <div className="absolute flex gap-5 font-mono text-[13px] text-ink-400" style={{ left: 112, top: 236, opacity: easeOutCubic(progress(l, 0.8, 1.4)) * (1 - dim) }}>
        {[
          ['#FBBF24', 'salt'],
          ['#38BDF8', 'solvent'],
          ['#7EE8D8', 'electrolyte (brighter = higher CE)'],
          ['#64748B', 'reference'],
        ].map(([c, label]) => (
          <span key={label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            {label}
          </span>
        ))}
      </div>

      <div className="absolute" style={{ left: 1372, top: 96, width: 500, opacity: easeOutCubic(progress(l, 0.6, 1.3)), transform: `translateX(${(1 - easeOutCubic(progress(l, 0.6, 1.3))) * 40}px)` }}>
        <WriteLog l={l} graph={graph} />
        <LiveQuery l={l} graph={graph} />
      </div>

      <Caption k={progress(l, 11.8, 12.4) * (1 - progress(l, 15.2, 15.7))} eyebrow="Fact change" y={972}>
        Each new paper can change an answer: best {QUERY.salt} + {QUERY.solvent} CE went {first.ce} % → {latest.ce} %
      </Caption>
      <Caption k={progress(l, 16.9, 17.5) * (1 - progress(l, dur - 0.9, dur - 0.4))} eyebrow="Graph complete" y={972}>
        {graph.events.length} CE facts · {graph.papers} papers · {nodeCount} nodes · {relCount} relationships
      </Caption>
    </div>
  );
}
