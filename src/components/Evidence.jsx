import { EVIDENCE_TEXT } from '../lib/data';
import { CheckIcon, DashIcon, TableIcon } from './Icons';

const STYLE = {
  found: { label: 'In text', className: 'border-kg/30 bg-kg/10 text-kg-soft', icon: <CheckIcon className="h-3 w-3" /> },
  table: { label: 'In a table', className: 'border-solvent/30 bg-solvent/10 text-[#7DD3FC]', icon: <TableIcon className="h-3 w-3" /> },
  missing: { label: 'Not found', className: 'border-salt/35 bg-salt/10 text-salt', icon: <span className="font-mono text-[11px] leading-none">?</span> },
  no_value: { label: 'No value', className: 'border-white/10 bg-white/[0.02] text-ink-400', icon: <DashIcon className="h-3 w-3" /> },
};

// Where the record's CE value was found in its own paper.
export function EvidenceBadge({ evidence, short = false }) {
  const s = STYLE[evidence.status];
  return (
    <span title={EVIDENCE_TEXT[evidence.status]} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] ${s.className}`}>
      {s.icon}
      {short ? null : s.label}
      {evidence.page != null && <span className="font-mono text-[11px] opacity-80">p.{evidence.page}</span>}
    </span>
  );
}

// The passage around the value, with the value marked.
export function EvidenceSnippet({ evidence, className = '' }) {
  if (!evidence.text) return null;
  const [a, b] = evidence.match;
  return (
    <blockquote className={`rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-[14px] leading-relaxed text-ink-300 ${className}`}>
      {evidence.text.slice(0, a)}
      <mark className="rounded bg-kg/20 px-0.5 font-semibold text-kg-soft">{evidence.text.slice(a, b)}</mark>
      {evidence.text.slice(b)}
    </blockquote>
  );
}
