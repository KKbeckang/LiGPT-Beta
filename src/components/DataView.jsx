import { useMemo, useState } from 'react';
import { download, RECORDS, recordsToCSV, STATS } from '../lib/data';
import { formatCE } from '../lib/electrolyte';
import { CEChart } from './CEChart';
import { EvidenceBadge } from './Evidence';
import { DownloadIcon, SearchIcon } from './Icons';

const CE_FILTERS = [
  { label: 'Any CE', min: null },
  { label: '≥ 90 %', min: 90 },
  { label: '≥ 99 %', min: 99 },
  { label: '≥ 99.5 %', min: 99.5 },
];

const EVIDENCE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'traced', label: 'Traced to text' },
  { id: 'missing', label: 'Not found' },
  { id: 'no_value', label: 'No CE' },
];

const counted = (key) => {
  const counts = new Map();
  for (const r of RECORDS) for (const item of r[key]) counts.set(item.name, (counts.get(item.name) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
const SALTS = counted('salts');
const SOLVENTS = counted('solvents');

function matches(r, f) {
  if (f.salt && !r.salts.some((s) => s.name === f.salt)) return false;
  if (f.solvent && !r.solvents.some((s) => s.name === f.solvent)) return false;
  if (f.minCE != null && !(r.ce >= f.minCE)) return false;
  if (f.evidence === 'traced' && !['found', 'table'].includes(r.evidence.status)) return false;
  if (f.evidence !== 'all' && f.evidence !== 'traced' && r.evidence.status !== f.evidence) return false;
  if (f.text) {
    const hay = `${r.label} ${r.name} ref ${r.ref} ${r.paper.title || ''} ${r.paper.first_author || ''} ${r.paper.journal || ''} ${r.paper.year || ''}`.toLowerCase();
    if (!f.text.toLowerCase().split(/\s+/).every((word) => hay.includes(word))) return false;
  }
  return true;
}

const SORTS = {
  ce: (a, b) => (a.ce ?? -1) - (b.ce ?? -1),
  electrolyte: (a, b) => a.label.localeCompare(b.label),
  paper: (a, b) => a.ref - b.ref || a.id.localeCompare(b.id, undefined, { numeric: true }),
};

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-3 py-1.5 text-[13.5px] transition ${value === o.id ? 'bg-white/[0.09] text-ink-100' : 'text-ink-400 hover:text-ink-100'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1 pl-3 pr-1 text-[13.5px] text-ink-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-[#0C1018] px-2 py-1 text-[14px] text-ink-100 outline-none focus:ring-1 focus:ring-kg/50"
      >
        <option value="">Any</option>
        {options.map(([name, n]) => (
          <option key={name} value={name}>
            {name} ({n})
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ value, label, hint, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={hint}
      className={`rounded-2xl border px-5 py-3.5 text-left transition ${
        active ? 'border-kg/40 bg-kg/[0.08]' : 'border-white/[0.07] bg-white/[0.025]'
      } ${onClick ? 'hover:border-white/20' : 'cursor-default'}`}
    >
      <div className="text-[28px] font-semibold leading-none tracking-tight text-ink-100">{value}</div>
      <div className="mt-1.5 text-[13px] text-ink-400">{label}</div>
    </button>
  );
}

function SortHeader({ id, sort, onSort, children, className = '' }) {
  const active = sort.key === id;
  return (
    <th className={`px-3 py-2.5 font-medium ${className}`}>
      <button type="button" onClick={() => onSort(id)} className={`inline-flex items-center gap-1 ${active ? 'text-ink-100' : 'hover:text-ink-200'}`}>
        {children}
        <span className="font-mono text-[11px]">{active ? (sort.dir === 'desc' ? '↓' : '↑') : ''}</span>
      </button>
    </th>
  );
}

function CEBar({ ce }) {
  if (ce == null) return <span className="font-mono text-[14px] text-ink-500">—</span>;
  const fill = Math.max(0.03, (ce - 80) / 20);
  return (
    <span className="flex items-center gap-3">
      <span className="w-[68px] font-mono text-[14.5px] text-kg-soft">{formatCE(ce)}</span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
        <span className="block h-full rounded-full bg-gradient-to-r from-kg-deep to-kg" style={{ width: `${Math.min(1, fill) * 100}%` }} />
      </span>
    </span>
  );
}

// filters overrides the filter state (the demo video drives it); reveal is passed to the chart.
export function DataView({ onOpen, selected, onToggleSelect, onSelectMany, filters, reveal }) {
  const [textState, setText] = useState('');
  const [saltState, setSalt] = useState('');
  const [solvent, setSolvent] = useState('');
  const [minCEState, setMinCE] = useState(null);
  const [evidence, setEvidence] = useState('all');
  const text = filters?.text ?? textState;
  const salt = filters?.salt ?? saltState;
  const minCE = filters?.minCE !== undefined ? filters.minCE : minCEState;
  const [sort, setSort] = useState({ key: 'ce', dir: 'desc' });

  const shown = useMemo(() => {
    const list = RECORDS.filter((r) => matches(r, { text: text.trim(), salt, solvent, minCE, evidence }));
    const cmp = SORTS[sort.key];
    return list.sort((a, b) => (sort.dir === 'desc' ? -cmp(a, b) : cmp(a, b)));
  }, [text, salt, solvent, minCE, evidence, sort]);
  const visible = useMemo(() => new Set(shown.map((r) => r.id)), [shown]);
  const filtered = Boolean(text.trim() || salt || solvent || minCE != null || evidence !== 'all');

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'ce' ? 'desc' : 'asc' }));
  const clear = () => {
    setText('');
    setSalt('');
    setSolvent('');
    setMinCE(null);
    setEvidence('all');
  };
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));

  return (
    <div className="mx-auto max-w-[1360px] pt-6">
      <div className="flex items-end gap-6">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] text-ink-100">Electrolyte data</h1>
          <p className="mt-2 max-w-3xl text-[16px] leading-relaxed text-ink-300">
            Every Coulombic efficiency the extraction found in the {STATS.papers} papers, with the passage it came from. Filter, open a record to check it against the paper, and add records to a comparison.
          </p>
        </div>
        <button
          type="button"
          onClick={() => download(filtered ? 'lithiummind-records-filtered.csv' : 'lithiummind-records.csv', recordsToCSV(shown))}
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[14px] font-medium text-ink-100 transition hover:border-white/25"
        >
          <DownloadIcon />
          Download CSV{filtered ? ` (${shown.length})` : ''}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-6 gap-3">
        <Stat value={STATS.records} label="records extracted" onClick={clear} active={!filtered} hint="Show all records" />
        <Stat value={STATS.withCE} label="with a CE value" />
        <Stat value={STATS.found} label="value in the paper text" onClick={() => setEvidence('traced')} active={evidence === 'traced'} hint="Value appears as printed in the paper" />
        <Stat value={STATS.table} label="number in a table" onClick={() => setEvidence('traced')} active={evidence === 'traced'} hint="A bare number next to the composition, as tables print them" />
        <Stat value={STATS.missing} label="not found, check by hand" onClick={() => setEvidence('missing')} active={evidence === 'missing'} />
        <Stat value={STATS.papers} label="papers" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-ink-400 focus-within:border-kg/40">
          <SearchIcon className="h-4 w-4" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search compositions, papers, authors, journals…"
            className="w-full bg-transparent text-[14.5px] text-ink-100 outline-none placeholder:text-ink-500"
          />
        </label>
        <Select label="Salt" value={salt} onChange={setSalt} options={SALTS} />
        <Select label="Solvent" value={solvent} onChange={setSolvent} options={SOLVENTS} />
        <Segmented options={CE_FILTERS.map((o) => ({ id: o.min, label: o.label }))} value={minCE} onChange={setMinCE} />
        <Segmented options={EVIDENCE_FILTERS} value={evidence} onChange={setEvidence} />
        {filtered && (
          <button type="button" onClick={clear} className="px-2 text-[13.5px] text-ink-400 underline-offset-2 hover:text-ink-100 hover:underline">
            Clear
          </button>
        )}
      </div>

      <section className="glass mt-5 rounded-[20px] px-6 pb-4 pt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink-100">Coulombic efficiency by salt</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-400">
              {filtered ? `${shown.filter((r) => r.ce != null).length} of ${STATS.withCE} values match the filters` : `All ${STATS.withCE} values`}. Click a dot to open the record, a salt to filter by it.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-ink-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-kg" /> Traced to the paper text
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-[1.8px] border-kg" /> Not found in the text
            </span>
            {filtered && (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-500" /> Outside the filters
              </span>
            )}
          </div>
        </div>
        <CEChart records={RECORDS} visible={visible} onOpen={onOpen} onSalt={setSalt} activeSalt={salt} reveal={reveal} />
      </section>

      <section className="glass mt-5 overflow-hidden rounded-[20px]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-3.5">
          <h2 className="text-[16px] font-semibold text-ink-100">
            Records <span className="font-normal text-ink-400">· {shown.length}</span>
          </h2>
          <span className="text-[13px] text-ink-500">Tick records to compare them side by side</span>
        </div>
        <div className="max-h-[760px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-[#0D1119] text-[13px] text-ink-400">
              <tr>
                <th className="w-12 px-3 py-2.5 pl-6">
                  <input
                    type="checkbox"
                    aria-label="Select all shown records"
                    checked={allShownSelected}
                    onChange={() => onSelectMany(shown.map((r) => r.id), !allShownSelected)}
                    className="h-4 w-4 accent-[#2DD4BF]"
                  />
                </th>
                <SortHeader id="electrolyte" sort={sort} onSort={onSort}>
                  Electrolyte
                </SortHeader>
                <SortHeader id="ce" sort={sort} onSort={onSort}>
                  CE
                </SortHeader>
                <th className="px-3 py-2.5 font-medium">Source</th>
                <SortHeader id="paper" sort={sort} onSort={onSort} className="pr-6">
                  Paper
                </SortHeader>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onOpen({ type: 'record', id: r.id })}
                  className={`cursor-pointer border-t border-white/[0.05] transition hover:bg-white/[0.035] ${selected.has(r.id) ? 'bg-kg/[0.05]' : ''}`}
                >
                  <td className="px-3 py-3 pl-6" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Compare ${r.label}`}
                      checked={selected.has(r.id)}
                      onChange={() => onToggleSelect(r.id)}
                      className="h-4 w-4 accent-[#2DD4BF]"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-[15px] text-ink-100">{r.label}</div>
                    <div className="mt-0.5 font-mono text-[11.5px] text-ink-500">#{r.id}</div>
                  </td>
                  <td className="px-3 py-3">
                    <CEBar ce={r.ce} />
                  </td>
                  <td className="px-3 py-3">
                    <EvidenceBadge evidence={r.evidence} />
                  </td>
                  <td className="max-w-[420px] px-3 py-3 pr-6">
                    <div className="truncate text-[14px] text-ink-200" title={r.paper.title || undefined}>
                      {r.paper.title || `Reference ${r.ref}`}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] text-ink-500">
                      {[r.paper.first_author && `${r.paper.first_author} et al.`, r.paper.journal, r.paper.year].filter(Boolean).join(' · ')}
                      {r.paper.first_author ? ' · ' : ''}Ref. {r.ref}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="px-6 py-10 text-center text-[14.5px] text-ink-400">No records match these filters.</p>}
        </div>
      </section>
    </div>
  );
}
