import { enter } from '../lib/motion';
import { findRecord, paperShort } from '../lib/data';
import { formatCE, formatElectrolyte } from '../lib/electrolyte';
import { modelLabel } from '../lib/models';
import { CypherBlock } from './CypherBlock';
import { EvidenceBadge } from './Evidence';
import { GraphIcon } from './Icons';
import { Label, Panel } from './Panel';

const CE_FLOOR = 80;

// One graph row; opens the record behind it (or its paper) in the side panel.
function EvidenceRow({ row, rank, k, onOpen }) {
  const fill = row.ce == null ? 0 : Math.max(0.03, (row.ce - CE_FLOOR) / (100 - CE_FLOOR));
  const record = findRecord(row);
  const target = record ? { type: 'record', id: record.id } : row.ref != null ? { type: 'paper', ref: row.ref } : null;
  return (
    <li style={enter(k, 8)} className="border-b border-white/[0.05] last:border-0">
      <button
        type="button"
        onClick={() => onOpen(target)}
        disabled={!onOpen || !target}
        className="grid w-full grid-cols-[24px_minmax(0,1fr)_132px] items-center gap-3 rounded-lg py-2.5 text-left transition enabled:hover:bg-white/[0.035]"
      >
        <span className="font-mono text-[12px] text-ink-500">{String(rank).padStart(2, '0')}</span>
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] text-ink-100">{formatElectrolyte(row)}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-500">
            <span className="truncate">{row.ref == null ? 'No reference' : `${paperShort(row.ref)} · Ref. ${row.ref}`}</span>
            {record && <EvidenceBadge evidence={record.evidence} short />}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span className="block h-full rounded-full bg-gradient-to-r from-kg-deep to-kg" style={{ width: `${fill * 100 * k}%` }} />
          </span>
          <span className="w-[60px] text-right font-mono text-[13.5px] text-kg-soft">{formatCE(row.ce)}</span>
        </span>
      </button>
    </li>
  );
}

export function KnowledgeGraphPanel({ result, reveal, style, onOpen }) {
  return (
    <Panel
      accent="kg"
      icon={<GraphIcon />}
      title="Knowledge graph"
      subtitle={result.model ? `Neo4j · Cypher written by ${modelLabel(result.model)}` : 'Demo · rows computed from the extracted records'}
      badge="Structured"
      style={style}
    >
      <CypherBlock code={result.cypher || '// The chain did not return a query'} progress={reveal.cypher} />
      <div>
        <Label right={<span>CE scale {CE_FLOOR}–100 %</span>}>Evidence · {result.rows.length} rows</Label>
        {result.rows.length ? (
          <ol>
            {result.rows.map((row, i) => (
              <EvidenceRow key={i} row={row} rank={i + 1} k={reveal.rows[i]} onOpen={onOpen} />
            ))}
          </ol>
        ) : (
          <p className="text-[14px] text-ink-400">The query returned no rows.</p>
        )}
      </div>
      <p style={enter(reveal.kgAnswer, 6)} className="rounded-xl border border-kg/15 bg-kg/[0.06] px-4 py-3 text-[14.5px] leading-relaxed text-ink-200">
        {result.kgAnswer}
      </p>
    </Panel>
  );
}
