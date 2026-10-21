import records from '../../data/records.json';
import { clamp, easeOutBack, easeOutCubic, progress } from '../../lib/motion';
import { CountUp, SectionTitle } from '../parts';

const CARDS = [
  { w: 300, title: 'Literature', step: '1' },
  { w: 470, title: 'LLM extraction', step: '2' },
  { w: 300, title: 'Structured facts', step: '3' },
  { w: 340, title: 'Knowledge graph', step: '4' },
];
const GAP = 64;
const TOP = 330;
const H = 340;
const X0 = (1920 - (CARDS.reduce((s, c) => s + c.w, 0) + GAP * (CARDS.length - 1))) / 2;
const XS = CARDS.reduce((xs, c, i) => [...xs, i ? xs[i - 1] + CARDS[i - 1].w + GAP : X0], []);
const appearAt = (i) => 0.6 + i * 1.1;

// The record for Ref. 47 as the hard schema returns it.
const JSON_LINES = [
  ['{', ['"ce"', ': ', '99.64', ',']],
  [' ', ['"electrolyte"', ': {']],
  ['   ', ['"salt_list"', ': [']],
  ['     ', ['{', '"salt"', ': ', '"LiFSI"', ', ', '"mol_L"', ': ', '7.0', '}],']],
  ['   ', ['"solvent_list"', ': [']],
  ['     ', ['{', '"solvent"', ': ', '"FEC"', ', ', '"volume_percent"', ': ', '1.0', '}]}}']],
];

function jsonColor(token) {
  if (/^"/.test(token)) return token.endsWith('"') && /"(LiFSI|FEC)"/.test(token) ? '#FBBF24' : '#7DD3FC';
  if (/^[\d.]+$/.test(token)) return '#F0ABFC';
  return '#7A859A';
}

function TypedJson({ k }) {
  const full = JSON_LINES.map(([indent, tokens]) => indent + tokens.join(''));
  let budget = Math.round(full.join('\n').length * k);
  return (
    <pre className="font-mono text-[13.5px] leading-[1.75]">
      {JSON_LINES.map(([indent, tokens], i) => {
        if (budget <= 0) return <div key={i}>&nbsp;</div>;
        const parts = [];
        let used = Math.min(budget, indent.length);
        parts.push(<span key="i">{indent.slice(0, used)}</span>);
        budget -= indent.length;
        tokens.forEach((tok, j) => {
          if (budget <= 0) return;
          parts.push(
            <span key={j} style={{ color: jsonColor(tok) }}>
              {tok.slice(0, budget)}
            </span>,
          );
          budget -= tok.length;
        });
        budget -= 1;
        const typing = k < 1 && budget <= 0;
        return (
          <div key={i}>
            {parts}
            {typing && <span className="inline-block h-[1em] w-[7px] translate-y-[2px] bg-kg" />}
          </div>
        );
      })}
    </pre>
  );
}

const BINS = [
  ['<90', (c) => c < 90],
  ['90–95', (c) => c >= 90 && c < 95],
  ['95–98', (c) => c >= 95 && c < 98],
  ['98–99', (c) => c >= 98 && c < 99],
  ['99–99.5', (c) => c >= 99 && c < 99.5],
  ['≥99.5', (c) => c >= 99.5],
];
const COUNTS = BINS.map(([, f]) => records.filter((r) => r.ce != null && f(r.ce)).length);

function Histogram({ k }) {
  const max = Math.max(...COUNTS);
  return (
    <div className="mt-5 flex h-[86px] items-end gap-2">
      {COUNTS.map((c, i) => {
        const e = easeOutCubic(progress(k, i * 0.08, 0.5 + i * 0.08));
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="w-full rounded-t-md bg-gradient-to-t from-kg-deep to-kg" style={{ height: (c / max) * 64 * e }} />
            <div className="font-mono text-[10px] text-ink-500">{BINS[i][0]}</div>
          </div>
        );
      })}
    </div>
  );
}

function Papers({ k }) {
  return (
    <svg width="150" height="96" viewBox="0 0 150 96" className="mx-auto">
      {[-10, 0, 10].map((rot, i) => {
        const e = easeOutBack(progress(k, i * 0.15, 0.55 + i * 0.15));
        return (
          <g key={rot} transform={`translate(75 52) rotate(${rot * e}) translate(-34 -42)`} opacity={clamp(e)}>
            <rect width="68" height="84" rx="7" fill="#111827" stroke="rgba(255,255,255,0.18)" />
            {[16, 26, 36, 46, 56].map((y) => (
              <rect key={y} x="11" y={y} width={y === 16 ? 30 : 46} height="3.2" rx="1.6" fill={y === 16 ? '#2DD4BF' : 'rgba(255,255,255,0.18)'} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

const MINI = {
  nodes: [
    { x: 176, y: 54, c: '#FBBF24', r: 13, label: 'Salt', above: true },
    { x: 60, y: 58, c: '#38BDF8', r: 11, label: 'Solvent', above: true },
    { x: 118, y: 112, c: '#2DD4BF', r: 15, label: 'Electrolyte' },
    { x: 236, y: 122, c: '#94A3B8', r: 9, label: 'Reference' },
    { x: 54, y: 150, c: '#38BDF8', r: 9 },
    { x: 196, y: 168, c: '#2DD4BF', r: 10 },
  ],
  links: [
    [2, 0, 'MOL_L'],
    [2, 1, 'VOLUME'],
    [2, 3, 'CITED'],
    [2, 4],
    [5, 0],
    [5, 3],
  ],
};

function MiniGraph({ k }) {
  return (
    <svg width="290" height="200" viewBox="0 0 290 200" className="mx-auto">
      {MINI.links.map(([a, b, label], i) => {
        const e = easeOutCubic(progress(k, 0.25 + i * 0.08, 0.6 + i * 0.08));
        const A = MINI.nodes[a];
        const B = MINI.nodes[b];
        return (
          <g key={i} opacity={e}>
            <line x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * e} y2={A.y + (B.y - A.y) * e} stroke="rgba(203,213,225,0.35)" strokeWidth="1.4" />
            {label && (
              <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 - 5} fontSize="9.5" textAnchor="middle" fill="#7A859A" fontFamily="JetBrains Mono, monospace">
                {label}
              </text>
            )}
          </g>
        );
      })}
      {MINI.nodes.map((n, i) => {
        const e = easeOutBack(progress(k, i * 0.07, 0.4 + i * 0.07));
        return (
          <g key={i} transform={`translate(${n.x} ${n.y}) scale(${e})`} opacity={clamp(e)}>
            <circle r={n.r + 6} fill={n.c} opacity="0.14" />
            <circle r={n.r} fill={n.c} />
            {n.label && (
              <text y={n.above ? -n.r - 8 : n.r + 15} textAnchor="middle" fontSize="11" fill="#C9D0DC" fontFamily="JetBrains Mono, monospace">
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Card({ i, l, children, label }) {
  const k = easeOutCubic(progress(l, appearAt(i), appearAt(i) + 0.6));
  return (
    <div
      className="glass absolute flex flex-col rounded-[22px] p-6"
      style={{ left: XS[i], top: TOP, width: CARDS[i].w, height: H, opacity: k, transform: `translateY(${(1 - k) * 34}px) scale(${0.96 + 0.04 * k})` }}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-kg/40 font-mono text-[13px] text-kg">{CARDS[i].step}</span>
        <span className="text-[19px] font-semibold text-ink-100">{CARDS[i].title}</span>
      </div>
      <div className="mt-5 flex-1">{children}</div>
      <div className="text-[14.5px] leading-snug text-ink-400">{label}</div>
    </div>
  );
}

function Connector({ i, l, t }) {
  const x1 = XS[i] + CARDS[i].w;
  const x2 = XS[i + 1];
  const y = TOP + H / 2;
  const k = easeOutCubic(progress(l, appearAt(i) + 0.5, appearAt(i + 1) + 0.2));
  return (
    <svg className="absolute" style={{ left: x1, top: y - 12, width: x2 - x1, height: 24 }} viewBox={`0 0 ${x2 - x1} 24`}>
      <line x1="6" y1="12" x2={6 + (x2 - x1 - 12) * k} y2="12" stroke="rgba(45,212,191,0.45)" strokeWidth="1.5" strokeDasharray="3 5" />
      {k >= 1 &&
        [0, 1, 2].map((j) => {
          const p = (t * 0.7 + j / 3) % 1;
          return <circle key={j} cx={6 + (x2 - x1 - 12) * p} cy="12" r="3" fill="#5EEAD4" opacity={Math.sin(p * Math.PI)} />;
        })}
      <path d={`M ${x2 - x1 - 10} 7 l 6 5 l -6 5`} fill="none" stroke="#2DD4BF" strokeWidth="1.5" opacity={k} />
    </svg>
  );
}

export function Pipeline({ t }) {
  const l = t;
  return (
    <div className="absolute inset-0">
      <SectionTitle k={progress(l, 0.1, 0.9)} index="01" eyebrow="Extraction pipeline" title="From 71 papers to a queryable knowledge graph" />
      {[0, 1, 2].map((i) => (
        <Connector key={i} i={i} l={l} t={t} />
      ))}
      <Card i={0} l={l} label="papers cited by the PNAS 2023 electrolyte dataset">
        <Papers k={progress(l, 0.8, 1.8)} />
        <div className="mt-4 text-center font-mono text-[64px] font-medium leading-none text-ink-100">
          <CountUp value={71} k={progress(l, 0.9, 2.0)} />
        </div>
      </Card>
      <Card i={1} l={l} label="GPT-4 Turbo fills a fixed schema · Ref. 47">
        <div className="rounded-xl border border-white/[0.07] bg-black/35 px-4 py-3">
          <TypedJson k={progress(l, 2.0, 3.8)} />
        </div>
      </Card>
      <Card i={2} l={l} label="CE–electrolyte records, by CE (%)">
        <div className="font-mono text-[64px] font-medium leading-none text-ink-100">
          <CountUp value={records.length} k={progress(l, 3.0, 4.2)} />
        </div>
        <Histogram k={progress(l, 3.2, 4.6)} />
      </Card>
      <Card i={3} l={l} label="Neo4j · salt, solvent, electrolyte, reference">
        <MiniGraph k={progress(l, 4.0, 5.4)} />
      </Card>
      <div
        className="absolute left-0 right-0 text-center text-[24px] text-ink-400"
        style={{ top: 760, opacity: easeOutCubic(progress(l, 5.3, 6.0)) }}
      >
        Papers are chunked and indexed with three embedding models; the passages most relevant to
        <br />
        Coulombic efficiency are sent to GPT-4 Turbo, which returns every CE value with its electrolyte.
      </div>
    </div>
  );
}
