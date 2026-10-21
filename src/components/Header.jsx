import { Wordmark } from './Logo';
import { BookIcon, GithubIcon, SearchIcon, TableIcon } from './Icons';
import { modelLabel } from '../lib/models';

const NAV = [
  { id: 'ask', label: 'Ask', icon: <SearchIcon className="h-4 w-4" /> },
  { id: 'data', label: 'Data', icon: <TableIcon /> },
  { id: 'how', label: 'How it works', icon: <BookIcon /> },
];

function StatusPill({ dot, label }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12.5px] text-ink-300">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function Header({ demo, onHome, model, view = 'ask', onNavigate }) {
  return (
    <header className="relative z-20 flex h-16 items-center gap-8 px-8">
      <button type="button" onClick={onHome} className="rounded-lg text-left" aria-label="LithiumMind home">
        <Wordmark />
      </button>
      <nav className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1" aria-label="Views">
        {NAV.map((item) => {
          const active = item.id === view;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[14px] font-medium transition ${
                active ? 'bg-white/[0.09] text-ink-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-ink-400 hover:text-ink-100'
              }`}
            >
              <span className={active ? 'text-kg' : ''}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <StatusPill dot="bg-kg shadow-[0_0_10px_#2DD4BF]" label="Neo4j knowledge graph" />
        <StatusPill dot="bg-llm shadow-[0_0_10px_#A78BFA]" label={demo ? 'Recorded LLM answers' : `${modelLabel(model) || 'LLM'} · RAG`} />
        {demo && (
          <span className="rounded-full border border-salt/30 bg-salt/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-salt">
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

// Background and header shared by every view.
export function Shell({ children, ...header }) {
  return (
    <div className="bg-aurora relative min-h-screen overflow-hidden">
      <div className="bg-dots pointer-events-none absolute inset-0" />
      <Header {...header} />
      <main className="relative z-10 px-8 pb-16">{children}</main>
    </div>
  );
}
