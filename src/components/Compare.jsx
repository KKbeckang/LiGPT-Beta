import { useEffect, useMemo } from 'react';
import { download, lce, paperShort, recordById, recordsToCSV } from '../lib/data';
import { formatCE } from '../lib/electrolyte';
import { EvidenceBadge } from './Evidence';
import { ArrowIcon, CloseIcon, CompareIcon, DownloadIcon } from './Icons';

const MAX_LCE = 3.1;
const TICKS = [80, 90, 99, 99.9];

// Bottom bar while records are picked for comparison.
export function CompareTray({ count, onOpen, onClear }) {
  if (!count) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-[#0C1018]/95 py-2 pl-5 pr-2 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9)] backdrop-blur">
      <CompareIcon className="h-4 w-4 text-kg" />
      <span className="text-[14px] text-ink-200">
        {count} record{count > 1 ? 's' : ''} selected
      </span>
      <button type="button" onClick={onOpen} className="rounded-xl bg-kg px-4 py-2 text-[14px] font-semibold text-ink-950 transition hover:bg-kg-soft">
        Compare
      </button>
      <button type="button" onClick={onClear} className="rounded-xl px-3 py-2 text-[14px] text-ink-400 transition hover:text-ink-100">
        Clear
      </button>
    </div>
  );
}

function compareQuestion(records) {
  const items = records.map((r) => `${r.label} (CE ${formatCE(r.ce)}, Ref. ${r.ref})`).join('; ');
  return `Compare these electrolytes and explain what drives the differences in Coulombic efficiency: ${items}.`;
}

// Selected records side by side: CE on one log scale, then a composition matrix.
export function ComparePanel({ ids, onClose, onOpen, onRemove, onAsk }) {
  const records = useMemo(
    () => ids.map(recordById).filter(Boolean).sort((a, b) => (b.ce ?? -1) - (a.ce ?? -1)),
    [ids],
  );
  const components = useMemo(() => {
    const salts = [...new Set(records.flatMap((r) => r.salts.map((s) => s.name)))];
    const solvents = [...new Set(records.flatMap((r) => r.solvents.map((s) => s.name)))];
    return [...salts.map((name) => ({ name, kind: 'salt' })), ...solvents.map((name) => ({ name, kind: 'solvent' }))];
  }, [records]);

  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cell = (r, c) => {
    const item = (c.kind === 'salt' ? r.salts : r.solvents).find((s) => s.name === c.name);
    if (!item) return null;
    const value = c.kind === 'salt' ? (item.mol ? `${item.mol} M` : '✓') : item.frac ?? '✓';
    return <span className="font-mono text-[13.5px] text-ink-100">{value}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-8">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-[1240px] rounded-[22px] border border-white/10 bg-[#0B0F17] shadow-2xl">
        <header className="flex items-center gap-4 border-b border-white/[0.06] px-7 py-5">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-ink-100">Compare {records.length} electrolytes</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-400">Sorted by Coulombic efficiency. Values as extracted; open a record to check it against its paper.</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => onAsk(compareQuestion(records))}
              className="inline-flex items-center gap-2 rounded-xl bg-llm/15 px-4 py-2 text-[14px] font-medium text-llm-soft transition hover:bg-llm/25"
            >
              Ask LiGPT to explain <ArrowIcon />
            </button>
            <button
              type="button"
              onClick={() => download('lithiummind-comparison.csv', recordsToCSV(records))}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-[14px] text-ink-100 transition hover:border-white/25"
            >
              <DownloadIcon /> CSV
            </button>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-ink-300 hover:text-ink-100" aria-label="Close">
              <CloseIcon />
            </button>
          </div>
        </header>

        <section className="px-7 py-6">
          <div className="mb-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-500">Coulombic efficiency · log scale</div>
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="grid grid-cols-[320px_minmax(0,1fr)_90px] items-center gap-4">
                <button type="button" onClick={() => onOpen({ type: 'record', id: r.id })} className="truncate text-left text-[14.5px] text-ink-100 hover:text-kg-soft">
                  {r.label}
                  <span className="ml-2 text-[12.5px] text-ink-500">{paperShort(r.ref)}</span>
                </button>
                <div className="relative h-6">
                  {TICKS.map((t) => (
                    <span key={t} className="absolute inset-y-0 w-px bg-white/[0.07]" style={{ left: `${(lce(t) / MAX_LCE) * 100}%` }} />
                  ))}
                  {r.ce != null && (
                    <span
                      className="absolute left-0 top-1/2 h-3.5 -translate-y-1/2 rounded-r-[4px] bg-gradient-to-r from-kg-deep to-kg"
                      style={{ width: `${(lce(r.ce) / MAX_LCE) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-right font-mono text-[15px] text-kg-soft">{formatCE(r.ce)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[320px_minmax(0,1fr)_90px] gap-4">
              <span />
              <div className="relative h-5">
                {TICKS.map((t) => (
                  <span key={t} className="absolute -translate-x-1/2 font-mono text-[12px] text-ink-500" style={{ left: `${(lce(t) / MAX_LCE) * 100}%` }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-x-auto border-t border-white/[0.06] px-7 py-6">
          <div className="mb-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-500">Composition · salt in mol/L, solvent fraction as extracted</div>
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="sticky left-0 w-[160px] bg-[#0B0F17]" />
                {records.map((r) => (
                  <th key={r.id} className="min-w-[150px] border-b border-white/[0.08] px-3 pb-3 align-bottom">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => onOpen({ type: 'record', id: r.id })} className="text-left">
                        <div className="font-mono text-[15px] font-medium text-kg-soft">{formatCE(r.ce)}</div>
                        <div className="mt-0.5 text-[12.5px] font-normal text-ink-400">#{r.id}</div>
                      </button>
                      <button type="button" onClick={() => onRemove(r.id)} className="text-ink-500 hover:text-ink-100" aria-label={`Remove ${r.label}`}>
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={`${c.kind}:${c.name}`}>
                  <td className="sticky left-0 border-b border-white/[0.05] bg-[#0B0F17] py-2 pr-3 text-[14.5px] text-ink-200">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${c.kind === 'salt' ? 'bg-salt' : 'bg-solvent'}`} />
                      {c.name}
                    </span>
                  </td>
                  {records.map((r) => (
                    <td key={r.id} className="border-b border-white/[0.05] px-3 py-2">
                      {cell(r, c) || <span className="text-ink-600">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 bg-[#0B0F17] py-3 pr-3 text-[13.5px] text-ink-400">LCE</td>
                {records.map((r) => (
                  <td key={r.id} className="px-3 py-3 font-mono text-[13.5px] text-ink-300">
                    {r.ce != null ? lce(r.ce).toFixed(2) : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-[#0B0F17] py-2 pr-3 text-[13.5px] text-ink-400">Source</td>
                {records.map((r) => (
                  <td key={r.id} className="px-3 py-2">
                    <EvidenceBadge evidence={r.evidence} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-[#0B0F17] py-2 pr-3 text-[13.5px] text-ink-400">Paper</td>
                {records.map((r) => (
                  <td key={r.id} className="px-3 py-2">
                    <button type="button" onClick={() => onOpen({ type: 'paper', ref: r.ref })} className="text-left text-[13.5px] text-ink-200 hover:text-llm-soft">
                      {paperShort(r.ref)}
                      <span className="block text-[12px] text-ink-500">
                        {r.paper.journal ? `${r.paper.journal} · ` : ''}Ref. {r.ref}
                      </span>
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
