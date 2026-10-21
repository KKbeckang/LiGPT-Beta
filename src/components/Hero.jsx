import { STATS } from '../lib/data';
import { ClockIcon } from './Icons';
import { QueryBox } from './QueryBox';

function Stat({ value, label }) {
  return (
    <div className="px-7 text-center">
      <div className="font-mono text-[24px] font-medium text-ink-100">{value}</div>
      <div className="mt-1 text-[13px] text-ink-400">{label}</div>
    </div>
  );
}

function Chip({ children, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[13.5px] text-ink-300 transition hover:border-kg/40 hover:text-ink-100"
    >
      {icon}
      {children}
    </button>
  );
}

export function Hero({ query, onQueryChange, onSubmit, examples, recent = [], onExample, readOnly, caret, pressed, picker }) {
  return (
    <section className="mx-auto flex max-w-[860px] flex-col items-center pt-[8vh] text-center">
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11.5px] uppercase tracking-[0.16em] text-ink-400">
        <span className="h-1.5 w-1.5 rounded-full bg-kg" />
        LLM Hackathon for Materials &amp; Chemistry · 2024
      </div>
      <h1 className="text-[62px] font-semibold leading-[1.03] tracking-[-0.035em] text-ink-100">
        Ask the <span className="text-gradient">lithium battery</span>
        <br />
        literature.
      </h1>
      <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-300">
        Every question gets two answers: structured facts from a Neo4j knowledge graph, and a contextual answer from the language model of your choice, grounded in {STATS.papers} papers. Each fact links back to the passage it came from.
      </p>
      <div className="mt-10 w-full">
        <QueryBox value={query} onChange={onQueryChange} onSubmit={onSubmit} readOnly={readOnly} caret={caret} pressed={pressed} picker={picker} />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {examples.map((example) => (
          <Chip key={example} onClick={() => onExample?.(example)}>
            {example}
          </Chip>
        ))}
      </div>
      {recent.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[12.5px] text-ink-500">Recent</span>
          {recent.map((q) => (
            <Chip key={q} onClick={() => onExample?.(q)} icon={<ClockIcon />}>
              {q.length > 70 ? `${q.slice(0, 68)}…` : q}
            </Chip>
          ))}
        </div>
      )}
      <div className="mt-14 flex divide-x divide-white/10">
        <Stat value={STATS.papers} label="papers indexed" />
        <Stat value={STATS.records} label="CE records extracted" />
        <Stat value={STATS.found + STATS.table} label="values traced to their paper" />
      </div>
    </section>
  );
}
