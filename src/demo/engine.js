// Demo mode: answers come from the real extraction results in database/extracted_info, exported to
// src/data/records.json by scripts/export_records.py. Knowledge-graph rows are computed from those
// records the way the Cypher query would return them. The LLM answers for the example questions were
// written from passages stored in the project's Chroma vector store; other questions get graph rows only.
import records from '../data/records.json';
import { formatCE, formatElectrolyte, graphName } from '../lib/electrolyte';
import { graphFromRows } from '../lib/graph';

// Shown in the model picker in demo mode; the recorded answers do not depend on the choice.
export const DEMO_MODELS = ['openai:gpt-4-turbo', 'anthropic:claude-opus-5-5', 'anthropic:claude-sonnet-5-5'];

export const DEMO_EXAMPLES = [
  'Which LiFSI electrolytes reach the highest Coulombic efficiency, and why?',
  'What Coulombic efficiency do commercial LiPF6 carbonate electrolytes reach?',
  'Which electrolytes use FEC as a solvent?',
];

const hasSalt = (r, name) => r.salts.some((s) => s.name === name);
const hasSolvent = (r, name) => r.solvents.some((s) => s.name === name);

// Same rows as RETURN DISTINCT e.name, e.coulombic_efficiency, r.reference_id ... ORDER BY ce DESC.
function topRows(filter, limit = 5) {
  const seen = new Set();
  return records
    .filter((r) => r.ce != null && filter(r))
    .map((r) => ({ name: graphName(r), ce: r.ce, ref: r.ref, salts: r.salts, solvents: r.solvents }))
    .filter((row) => {
      const key = `${row.name}|${row.ce}|${row.ref}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.ce - a.ce || a.ref - b.ref)
    .slice(0, limit);
}

// Plain-language summary of the rows, standing in for the chain's answer step.
function describe(rows, subject) {
  if (!rows.length) return `No ${subject} with a reported Coulombic efficiency in the graph.`;
  const [first, second, ...rest] = rows;
  let text = `The graph returns ${rows.length} ${subject}. Highest: ${formatElectrolyte(first)} at ${formatCE(first.ce)} (Ref. ${first.ref}).`;
  if (second) text += ` Next: ${formatElectrolyte(second)} at ${formatCE(second.ce)} (Ref. ${second.ref}).`;
  if (rest.length) {
    const values = rest.map((r) => r.ce);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const range = lo === hi ? formatCE(lo) : `${+lo.toFixed(2)}–${formatCE(hi)}`;
    const refs = [...new Set(rest.map((r) => r.ref))].join(', ');
    text += ` ${rest.length} more at ${range} (Refs. ${refs}).`;
  }
  return text;
}

function cypherFor(salts, solvents, { requireSolvent, singleSalt }) {
  const patterns = [
    ...salts.map((s) => `-[:MOL_L]->(:Salt {name: '${s}'})`),
    ...solvents.map((s) => `-[:VOLUME]->(:Solvent {name: '${s}'})`),
    ...(requireSolvent && !solvents.length ? ['-[:VOLUME]->(:Solvent)'] : []),
    '-[:CITED]->(r:Reference)',
  ];
  return [
    ...patterns.map((p, i) => `MATCH (${i ? 'e' : 'e:Electrolyte'})${p}`),
    ...(singleSalt ? ['WHERE COUNT { (e)-[:MOL_L]->(:Salt) } = 1'] : []),
    'RETURN DISTINCT e.name AS electrolyte,',
    '       e.coulombic_efficiency AS ce,',
    '       r.reference_id AS ref',
    'ORDER BY ce DESC',
    'LIMIT 5',
  ].join('\n');
}

const LIFSI_SOURCES = [
  { ref: 47, page: 1, text: 'By using up to 7 m of Li bis(fluorosulfonyl)imide in fluoroethylene carbonate, where both the solvent and the salt donate F, we can significantly suppress anode porosity and improve the Coulombic efficiency to 99.64%.' },
  { ref: 3, page: 1, text: 'Paired with 1 M lithium bis(fluorosulfonyl)imide, this electrolyte possesses unique Li–F binding and high anion/solvent ratio in the solvation sheath, leading to excellent compatibility with both Li metal anodes (Coulombic efficiency ~ 99.52% and fast activation within five cycles) and high-voltage cathodes (~6 V stability).' },
  { ref: 23, page: 1, text: '1.2 m lithium bis(fluorosulfonyl)imide in a mixture of dimethyl carbonate/bis(2,2,2-trifluoroethyl) ether (1:2 by mol) is reported that enables dendrite-free cycling of lithium-metal anodes with high Coulombic efficiency (99.5%) and excellent capacity retention (>80% after 700 cycles).' },
  { ref: 71, page: 1, text: 'Combining the dual-solvent system with 1 m lithium bis(fluorosulfonyl)imide (LiFSI), high Li-metal Coulombic efficiency (99.5%) and oxidative stability (6 V) are achieved.' },
  { ref: 12, page: 1, text: 'For instance, the generation of LiF-rich layer was considered a key point to achieve high Coulombic efficiency in both all-fluorinated and LiFSI-based concentrated electrolytes.' },
];

const LIPF6_SOURCES = [
  { ref: 12, page: 2, text: 'The Coulombic efficiency of Li metal in the commercial lithium hexafluorophosphate (LiPF6)–ethylene carbonate/diethyl carbonate (EC/DEC) electrolyte was only about 90%.' },
  { ref: 23, page: 1, text: 'Commercial electrolytes used in LIBs (typically 1–1.2 m lithium hexafluorophosphate (LiPF6) in a mixture of carbonate solvents) are not suitable for LMBs because they will lead to dendritic growth and very low Coulombic efficiency (CE) of LMAs.' },
  { ref: 36, page: 1, text: 'With controlled Li deposition in TTFEB-containing electrolyte, a significantly improved Coulombic efficiency (~96%) in Li|Cu cell, long lifetime (over 1000 h), and weak polarization in Li|Li cell can be obtained.' },
];

const SCENARIOS = [
  {
    match: (q) => q.includes('lifsi') && /highest|best|top/.test(q),
    salts: ['LiFSI'],
    solvents: [],
    requireSolvent: true,
    subject: 'LiFSI electrolytes',
    llmAnswer:
      'The highest-CE LiFSI systems share one design idea: fluorine in both the salt and the solvent, so the SEI that forms on lithium is LiF-rich [12]. Using up to 7 m LiFSI in FEC suppresses anode porosity and lifts CE to 99.64 % [47]. The fluorinated ether FDMB with 1 M LiFSI builds an anion-rich solvation sheath with Li–F binding, giving about 99.52 % [3]. A localized high-concentration electrolyte, 1.2 m LiFSI in DMC/BTFE, reaches 99.5 % [23], and so does the FDMH/DME dual-solvent system [71].',
    sources: LIFSI_SOURCES,
  },
  {
    match: (q) => q.includes('lipf6') && /commercial|carbonate/.test(q),
    salts: ['LiPF6'],
    solvents: ['EC', 'DMC'],
    singleSalt: true,
    subject: 'LiPF6 carbonate electrolytes',
    llmAnswer:
      'Conventional LiPF6 carbonate electrolytes are a poor fit for lithium metal. One study puts the CE of lithium in commercial LiPF6–EC/DEC at only about 90 % [12], and another notes that 1–1.2 m LiPF6 in carbonate solvents leads to dendritic growth and very low CE [23]. The ~96 % reported in [36] is reached only after adding the TTFEB additive, so it is not a baseline for plain LiPF6 in EC/DMC.',
    sources: LIPF6_SOURCES,
  },
];

const ALL_SALTS = [...new Set(records.flatMap((r) => r.salts.map((s) => s.name)))];
const ALL_SOLVENTS = [...new Set(records.flatMap((r) => r.solvents.map((s) => s.name)))];
// Short names (AN, ES, PC) only match with exact case so ordinary words don't trigger them.
const mentioned = (names, query) =>
  names.filter((n) => {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, n.length > 3 ? 'i' : '').test(query);
  });

export function answerFromDemo(query) {
  const q = query.toLowerCase();
  const scenario = SCENARIOS.find((s) => s.match(q));
  const salts = scenario ? scenario.salts : mentioned(ALL_SALTS, query);
  const solvents = scenario ? scenario.solvents : mentioned(ALL_SOLVENTS, query);
  const requireSolvent = Boolean(scenario?.requireSolvent);
  const singleSalt = Boolean(scenario?.singleSalt);
  const rows = topRows(
    (r) =>
      salts.every((s) => hasSalt(r, s)) &&
      solvents.every((s) => hasSolvent(r, s)) &&
      (!requireSolvent || r.solvents.length > 0) &&
      (!singleSalt || r.salts.length === 1),
  );
  const names = [...salts, ...solvents];
  const subject = scenario?.subject || (names.length ? `electrolytes containing ${names.join(' + ')}` : 'electrolytes');
  return {
    cypher: cypherFor(salts, solvents, { requireSolvent, singleSalt }),
    rows,
    graph: graphFromRows(rows, 'demo'),
    kgAnswer: describe(rows, subject),
    llmAnswer: scenario?.llmAnswer || '',
    llmNote: scenario ? '' : 'Demo mode has recorded LLM answers for the first two example questions only. Start the Flask server to get live answers from the model you pick.',
    sources: scenario?.sources || [],
    model: null,
  };
}
