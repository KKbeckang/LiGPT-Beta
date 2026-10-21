// The extracted records and paper list (written by scripts/export_records.py), with lookups and exports.
import papers from '../data/papers.json';
import records from '../data/records.json';
import { formatCE, formatElectrolyte, graphName } from './electrolyte';

export const PAPERS = new Map(papers.map((p) => [p.ref, p]));

// The salt that sets the chemistry: the most concentrated lithium salt (additives such as RbNO3 aside).
function mainSalt(r) {
  if (!r.salts.length) return 'No salt listed';
  const lithium = r.salts.filter((s) => s.name.startsWith('Li'));
  return (lithium.length ? lithium : r.salts).reduce((a, b) => ((b.mol ?? -1) > (a.mol ?? -1) ? b : a)).name;
}

export const RECORDS = records.map((r) => ({
  ...r,
  name: graphName(r),
  label: formatElectrolyte(r),
  mainSalt: mainSalt(r),
  paper: PAPERS.get(r.ref) || { ref: r.ref },
}));

const byId = new Map(RECORDS.map((r) => [r.id, r]));
export const recordById = (id) => byId.get(id);
export const recordsOfPaper = (ref) => RECORDS.filter((r) => r.ref === ref);

// Graph rows carry the Electrolyte node name, CE and reference; find the record behind one.
const byKey = new Map(RECORDS.map((r) => [`${r.ref}|${r.ce}|${r.name}`, r]));
export function findRecord(row) {
  if (row.ref == null) return null;
  const exact = byKey.get(`${row.ref}|${row.ce}|${(row.name || '').trim()}`);
  if (exact) return exact;
  const sameValue = RECORDS.filter((r) => r.ref === row.ref && r.ce === row.ce);
  return sameValue.length === 1 ? sameValue[0] : null;
}

export const STATS = (() => {
  const count = (status) => RECORDS.filter((r) => r.evidence.status === status).length;
  return {
    papers: papers.length,
    chunks: papers.reduce((n, p) => n + p.chunks, 0),
    records: RECORDS.length,
    withCE: RECORDS.length - count('no_value'),
    found: count('found'),
    table: count('table'),
    missing: count('missing'),
    noValue: count('no_value'),
  };
})();

// Log-scale CE, as in Kim et al. (PNAS 2023): 90 % -> 1, 99 % -> 2, 99.9 % -> 3.
export const lce = (ce) => -Math.log10(1 - Math.min(ce, 99.99) / 100);

export const doiUrl = (paper) => (paper?.doi ? `https://doi.org/${paper.doi}` : null);

// "Yu et al. 2020", or "Ref. 3" when the paper's metadata is unknown.
export function paperShort(ref) {
  const p = PAPERS.get(ref);
  if (!p?.first_author) return `Ref. ${ref}`;
  return `${p.first_author} et al.${p.year ? ` ${p.year}` : ''}`;
}

export function paperCitation(ref) {
  const p = PAPERS.get(ref);
  if (!p?.title) return `Reference ${ref} of the LithiumMind corpus`;
  const parts = [`${p.first_author} et al.`, p.title, [p.journal, p.year && `(${p.year})`].filter(Boolean).join(' ')];
  return parts.filter(Boolean).join('. ') + '.' + (p.doi ? ` https://doi.org/${p.doi}` : '');
}

export const EVIDENCE_TEXT = {
  found: 'Value appears in the paper text',
  table: 'Number appears next to this composition, as in a table',
  missing: 'Value not found in the paper text; it may come from a figure, or be wrong',
  no_value: 'The extraction has no CE value',
};

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function recordsToCSV(list) {
  const header = ['id', 'electrolyte', 'salts_mol_per_L', 'solvent_ratio', 'ce_percent', 'evidence', 'page', 'ref', 'first_author', 'year', 'journal', 'title', 'doi'];
  const rows = list.map((r) => [
    r.id,
    r.label,
    r.salts.map((s) => (s.mol ? `${s.name} ${s.mol}` : s.name)).join('; '),
    r.solvents.map((s) => (s.frac ? `${s.name} ${s.frac}` : s.name)).join('; '),
    r.ce,
    r.evidence.status,
    r.evidence.page,
    r.ref,
    r.paper.first_author,
    r.paper.year,
    r.paper.journal,
    r.paper.title,
    r.paper.doi,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

// Graph rows from an answer; rows that match an extracted record get its paper and evidence.
export function rowsToCSV(rows) {
  const header = ['rank', 'electrolyte', 'ce_percent', 'ref', 'first_author', 'year', 'title', 'doi', 'evidence', 'page', 'graph_name'];
  const lines = rows.map((row, i) => {
    const rec = findRecord(row);
    const p = PAPERS.get(row.ref) || {};
    return [i + 1, formatElectrolyte(row), row.ce, row.ref, p.first_author, p.year, p.title, p.doi, rec?.evidence.status, rec?.evidence.page, (row.name || '').trim()];
  });
  return [header, ...lines].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

export function answerToMarkdown(question, result) {
  const lines = [`## ${question}`, '', '### Knowledge graph', ''];
  result.rows.forEach((row, i) => lines.push(`${i + 1}. ${formatElectrolyte(row)}: CE ${formatCE(row.ce)} (${paperShort(row.ref)}, ref. ${row.ref})`));
  if (result.kgAnswer) lines.push('', result.kgAnswer);
  if (result.llmAnswer) lines.push('', '### LLM answer', '', result.llmAnswer);
  const refs = [...new Set([...result.rows.map((r) => r.ref), ...result.sources.map((s) => s.ref)].filter((r) => r != null))].sort((a, b) => a - b);
  if (refs.length) {
    lines.push('', '### References', '');
    refs.forEach((ref) => lines.push(`- [${ref}] ${paperCitation(ref)}`));
  }
  return lines.join('\n') + '\n';
}

export function download(filename, text, type = 'text/csv') {
  // The byte-order mark makes Excel read the CSV as UTF-8 (names such as "LiFSI · DME").
  const body = type === 'text/csv' ? `\ufeff${text}` : text;
  const url = URL.createObjectURL(new Blob([body], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
