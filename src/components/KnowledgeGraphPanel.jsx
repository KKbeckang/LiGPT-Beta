import { enter } from '../lib/motion';
import { formatCE, formatElectrolyte } from '../lib/electrolyte';
import { modelLabel } from '../lib/models';
import { CypherBlock } from './CypherBlock';
import { GraphIcon } from './Icons';
import { Label, Panel } from './Panel';
import { Subgraph } from './Subgraph';

const CE_FLOOR = 80;

function EvidenceRow({ row, rank, k }) {
  const fill = row.ce == null ? 0 : Math.max(0.03, (row.ce - CE_FLOOR) / (100 - CE_FLOOR));
  return (
    <li style={enter(k, 8)} className="grid grid-cols-[22px_minmax(0,1fr)_112px_64px] items-center gap-3 border-b border-white/[0.05] py-2 last:border-0">
      <span className="font-mono text-[11px] text-ink-500">{String(rank).padStart(2, '0')}</span>
      <span className="truncate text-[13px] text-ink-100">{formatElectrolyte(row)}</span>
      <span className="flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <span className="block h-full rounded-full bg-gradient-to-r from-kg-deep to-kg" style={{ width: `${fill * 100 * k}%` }} />
        </span>
        <span className="w-[52px] text-right font-mono text-[12px] text-kg-soft">{formatCE(row.ce)}</span>
      </span>
      <span className="justify-self-end whitespace-nowrap rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-300">
        {row.ref == null ? '—' : `Ref. ${row.ref}`}
      </span>
    </li>
  );
}

export function KnowledgeGraphPanel({ result, reveal, style }) {
  return (
    <Panel
      accent="kg"
      icon={<GraphIcon />}
      title="Knowledge graph"
      subtitle={result.model ? `Neo4j · Cypher written by ${modelLabel(result.model)}` : 'Demo · rows computed from the extracted records'}
      badge="Structured"
      style={style}
    >
      <div className="grid grid-cols-[1fr_224px] gap-4">
        <CypherBlock code={result.cypher || '// The chain did not return a query'} progress={reveal.cypher} />
        <div className="flex flex-col rounded-xl border border-white/[0.07] bg-black/20">
          <div className="px-3 pt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">Result subgraph</div>
          <div className="flex flex-1 items-center justify-center">
            <Subgraph rows={result.rows} progress={reveal.graph} width={222} height={176} />
          </div>
          <div className="flex justify-center gap-3 pb-2 font-mono text-[9.5px] text-ink-400">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-salt" />salt</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-solvent" />solvent</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-kg" />CE %</span>
          </div>
        </div>
      </div>
      <div>
        <Label right={<span>CE scale {CE_FLOOR}–100 %</span>}>Evidence · {result.rows.length} rows</Label>
        {result.rows.length ? (
          <ol>
            {result.rows.map((row, i) => (
              <EvidenceRow key={i} row={row} rank={i + 1} k={reveal.rows[i]} />
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-ink-400">The query returned no rows.</p>
        )}
      </div>
      <p style={enter(reveal.kgAnswer, 6)} className="rounded-xl border border-kg/15 bg-kg/[0.06] px-4 py-3 text-[13.5px] leading-relaxed text-ink-200">
        {result.kgAnswer}
      </p>
    </Panel>
  );
}
