import { useEffect, useMemo, useState } from 'react';
import { doiUrl, EVIDENCE_TEXT, lce, paperCitation, paperShort, PAPERS, recordById, RECORDS, recordsOfPaper } from '../lib/data';
import { formatCE } from '../lib/electrolyte';
import { EvidenceBadge, EvidenceSnippet } from './Evidence';
import { ArrowIcon, CheckIcon, CloseIcon, CompareIcon, CopyIcon, ExternalIcon } from './Icons';

function Section({ title, right, children }) {
  return (
    <section className="border-t border-white/[0.06] px-7 py-5">
      <div className="mb-3 flex items-center justify-between font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-500">
        <span>{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => {
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      })}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-ink-200 transition hover:border-white/25"
    >
      {done ? <CheckIcon /> : <CopyIcon className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function PaperCard({ refId }) {
  const p = PAPERS.get(refId) || { ref: refId };
  const url = doiUrl(p);
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="font-mono text-[12px] text-llm-soft">Ref. {refId}</div>
      <div className="mt-1 text-[15.5px] font-medium leading-snug text-ink-100">{p.title || 'Title not available'}</div>
      <div className="mt-1.5 text-[13.5px] text-ink-400">
        {[p.first_author && `${p.first_author} et al.`, p.journal, p.year].filter(Boolean).join(' · ') || 'Bibliographic details not available'}
      </div>
      {p.note && <p className="mt-2.5 rounded-lg border border-salt/25 bg-salt/[0.07] px-3 py-2 text-[13px] leading-relaxed text-ink-200">{p.note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-llm/15 px-3 py-1.5 text-[13px] font-medium text-llm-soft transition hover:bg-llm/25">
            Open paper <ExternalIcon />
          </a>
        )}
        <CopyButton text={paperCitation(refId)} label="Copy citation" />
        {p.doi && <span className="self-center font-mono text-[12px] text-ink-500">doi:{p.doi}</span>}
      </div>
    </div>
  );
}

function RecordLine({ record, onOpen, active, showPaper = true }) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ type: 'record', id: record.id })}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.05] ${active ? 'bg-white/[0.06]' : ''}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[14px] text-ink-100">{record.label}</span>
        <span className="block truncate text-[12.5px] text-ink-500">{showPaper ? `${paperShort(record.ref)} · Ref. ${record.ref}` : `#${record.id}`}</span>
      </span>
      <span className="font-mono text-[13.5px] text-kg-soft">{formatCE(record.ce)}</span>
      <EvidenceBadge evidence={record.evidence} short />
    </button>
  );
}

// Same main salt and at least one shared solvent, from other papers: the obvious comparisons.
function similarTo(record) {
  const solvents = new Set(record.solvents.map((s) => s.name));
  return RECORDS.filter(
    (r) => r.id !== record.id && r.ce != null && r.mainSalt === record.mainSalt && r.solvents.some((s) => solvents.has(s.name)),
  )
    .sort((a, b) => (a.ref === record.ref) - (b.ref === record.ref) || b.ce - a.ce)
    .slice(0, 6);
}

function RecordBody({ record, onOpen, selected, onToggleSelect, onAsk }) {
  const similar = useMemo(() => similarTo(record), [record]);
  const siblings = useMemo(() => recordsOfPaper(record.ref), [record]);
  const inCompare = selected.has(record.id);
  return (
    <>
      <div className="px-7 pb-6">
        <div className="flex items-end gap-6">
          <div>
            <div className="text-[12px] text-ink-500">Coulombic efficiency</div>
            <div className="text-[44px] font-semibold leading-none tracking-tight text-ink-100">{formatCE(record.ce)}</div>
          </div>
          {record.ce != null && (
            <div className="pb-1 text-[13px] text-ink-400" title="−log₁₀(1 − CE), the log-scale CE used by Kim et al. (PNAS 2023)">
              LCE <span className="font-mono text-ink-200">{lce(record.ce).toFixed(2)}</span>
            </div>
          )}
          <div className="ml-auto pb-1">
            <EvidenceBadge evidence={record.evidence} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleSelect(record.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition ${
              inCompare ? 'bg-kg/20 text-kg-soft' : 'border border-white/10 text-ink-200 hover:border-white/25'
            }`}
          >
            {inCompare ? <CheckIcon /> : <CompareIcon className="h-4 w-4" />}
            {inCompare ? 'In comparison' : 'Add to comparison'}
          </button>
          <button
            type="button"
            onClick={() => onAsk(`What do the papers report about ${record.label}, and how does its Coulombic efficiency compare with similar electrolytes?`)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-[13.5px] font-medium text-ink-200 transition hover:border-white/25"
          >
            Ask about it <ArrowIcon />
          </button>
        </div>
      </div>

      <Section title="Composition (as extracted)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 text-[12.5px] text-ink-500">Salts</div>
            {record.salts.length ? (
              record.salts.map((s) => (
                <div key={s.name} className="flex items-center justify-between border-b border-white/[0.05] py-1.5 text-[14.5px]">
                  <span className="flex items-center gap-2 text-ink-100">
                    <span className="h-2 w-2 rounded-full bg-salt" />
                    {s.name}
                  </span>
                  <span className="font-mono text-[13px] text-ink-300">{s.mol ? `${s.mol} M` : '—'}</span>
                </div>
              ))
            ) : (
              <div className="text-[13.5px] text-ink-500">None listed</div>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-[12.5px] text-ink-500">Solvents · fraction</div>
            {record.solvents.length ? (
              record.solvents.map((s) => (
                <div key={s.name} className="flex items-center justify-between border-b border-white/[0.05] py-1.5 text-[14.5px]">
                  <span className="flex items-center gap-2 text-ink-100">
                    <span className="h-2 w-2 rounded-full bg-solvent" />
                    {s.name}
                  </span>
                  <span className="font-mono text-[13px] text-ink-300">{s.frac ?? '—'}</span>
                </div>
              ))
            ) : (
              <div className="text-[13.5px] text-ink-500">None listed</div>
            )}
          </div>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
          Fractions are stored in the schema&apos;s volume field; papers give volume, weight or molar ratios, so check the source for which one. Test conditions (temperature, current density, cell type) are not part of the extraction.
        </p>
      </Section>

      <Section title={`Source passage${record.evidence.page ? ` · page ${record.evidence.page}` : ''}`}>
        {record.evidence.text ? (
          <EvidenceSnippet evidence={record.evidence} />
        ) : (
          <p className="text-[14px] leading-relaxed text-ink-300">{EVIDENCE_TEXT[record.evidence.status]}.</p>
        )}
        <p className="mt-2 text-[12.5px] text-ink-500">{EVIDENCE_TEXT[record.evidence.status]}. Found by matching the value against the paper&apos;s extracted text.</p>
      </Section>

      <Section title="Paper">
        <PaperCard refId={record.ref} />
      </Section>

      {siblings.length > 1 && (
        <Section title={`Other records from this paper · ${siblings.length - 1}`}>
          <div className="-mx-3">
            {siblings.filter((r) => r.id !== record.id).map((r) => (
              <RecordLine key={r.id} record={r} onOpen={onOpen} showPaper={false} />
            ))}
          </div>
        </Section>
      )}

      {similar.length > 0 && (
        <Section title={`Similar electrolytes · ${record.mainSalt} with a shared solvent`}>
          <div className="-mx-3">
            {similar.map((r) => (
              <RecordLine key={r.id} record={r} onOpen={onOpen} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function PaperBody({ refId, onOpen }) {
  const list = recordsOfPaper(refId);
  const traced = list.filter((r) => r.evidence.status === 'found' || r.evidence.status === 'table').length;
  return (
    <>
      <div className="px-7 pb-6">
        <PaperCard refId={refId} />
      </div>
      <Section title={`Extracted records · ${list.length}`} right={<span className="normal-case tracking-normal">{traced} traced to the text</span>}>
        <div className="-mx-3">
          {list.map((r) => (
            <RecordLine key={r.id} record={r} onOpen={onOpen} showPaper={false} />
          ))}
        </div>
      </Section>
    </>
  );
}

// Side panel with everything about one record or one paper.
// enter (0 to 1) slides the panel in; the demo video animates it.
export function RecordDrawer({ target, onClose, onOpen, selected, onToggleSelect, onAsk, enter = 1 }) {
  useEffect(() => {
    if (!target) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const record = target?.type === 'record' ? recordById(target.id) : null;
  if (!target || (target.type === 'record' && !record)) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" style={{ opacity: enter }} />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-[600px] flex-col border-l border-white/10 bg-[#0B0F17] shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.8)]"
        style={enter < 1 ? { transform: `translateX(${(1 - enter) * 100}%)` } : undefined}
      >
        <header className="flex items-start gap-4 px-7 pb-4 pt-6">
          <div className="min-w-0">
            <div className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-500">
              {record ? `Record ${record.id}` : `Paper · Ref. ${target.ref}`}
            </div>
            <h2 className="mt-1.5 text-[22px] font-semibold leading-snug tracking-tight text-ink-100">
              {record ? record.label : paperShort(target.ref)}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-300 hover:text-ink-100" aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto pb-8">
          {record ? (
            <RecordBody record={record} onOpen={onOpen} selected={selected} onToggleSelect={onToggleSelect} onAsk={onAsk} />
          ) : (
            <PaperBody refId={target.ref} onOpen={onOpen} />
          )}
        </div>
      </aside>
    </div>
  );
}
