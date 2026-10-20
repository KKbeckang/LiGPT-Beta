import records from '../demo/records.json';
import { QueryBox } from './QueryBox';

const PAPERS = 71;

function Stat({ value, label }) {
  return (
    <div className="px-6 text-center">
      <div className="font-mono text-[22px] font-medium text-ink-100">{value}</div>
      <div className="mt-1 text-[12px] text-ink-400">{label}</div>
    </div>
  );
}

export function Hero({ query, onQueryChange, onSubmit, examples, onExample, readOnly, caret, pressed, picker }) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center pt-[9vh] text-center">
      <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">
        <span className="h-1.5 w-1.5 rounded-full bg-kg" />
        LLM Hackathon for Materials &amp; Chemistry · 2024
      </div>
      <h1 className="text-[58px] font-semibold leading-[1.03] tracking-[-0.035em] text-ink-100">
        Ask the <span className="text-gradient">lithium battery</span>
        <br />
        literature.
      </h1>
      <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-300">
        Every question gets two answers: structured facts from a Neo4j knowledge graph, and a contextual answer from the language model of your choice, grounded in {PAPERS} papers.
      </p>
      <div className="mt-10 w-full">
        <QueryBox value={query} onChange={onQueryChange} onSubmit={onSubmit} readOnly={readOnly} caret={caret} pressed={pressed} picker={picker} />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onExample?.(example)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12.5px] text-ink-300 transition hover:border-kg/40 hover:text-ink-100"
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mt-14 flex divide-x divide-white/10">
        <Stat value={PAPERS} label="papers indexed" />
        <Stat value={records.length} label="CE facts extracted" />
        <Stat value="2" label="answer engines" />
      </div>
    </section>
  );
}
