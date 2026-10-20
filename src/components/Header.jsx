import { Wordmark } from './Logo';
import { GithubIcon } from './Icons';
import { modelLabel } from '../lib/models';

function StatusPill({ dot, label }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] text-ink-300">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function Header({ demo, onHome, model }) {
  return (
    <header className="relative z-10 flex h-16 items-center justify-between px-8">
      <button type="button" onClick={onHome} className="rounded-lg text-left" aria-label="LithiumMind home">
        <Wordmark />
      </button>
      <div className="flex items-center gap-2">
        <StatusPill dot="bg-kg shadow-[0_0_10px_#2DD4BF]" label="Neo4j knowledge graph" />
        <StatusPill dot="bg-llm shadow-[0_0_10px_#A78BFA]" label={demo ? 'Recorded LLM answers' : `${modelLabel(model) || 'LLM'} · RAG`} />
        {demo && (
          <span className="rounded-full border border-salt/30 bg-salt/10 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-salt">
            Demo data
          </span>
        )}
        <a
          href="https://github.com/KKbeckang/LiGPT-Beta"
          target="_blank"
          rel="noreferrer"
          className="ml-1 grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-ink-300 transition hover:border-white/20 hover:text-ink-100"
          aria-label="Source on GitHub"
        >
          <GithubIcon />
        </a>
      </div>
    </header>
  );
}
