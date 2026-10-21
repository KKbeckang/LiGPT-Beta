const ACCENTS = {
  kg: { line: 'via-kg/70', icon: 'bg-kg/10 text-kg', badge: 'border-kg/30 text-kg' },
  llm: { line: 'via-llm/70', icon: 'bg-llm/10 text-llm', badge: 'border-llm/30 text-llm' },
};

export function Panel({ accent, icon, title, subtitle, badge, style, children }) {
  const a = ACCENTS[accent];
  return (
    <section style={style} className="glass relative flex flex-col overflow-hidden rounded-[20px]">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${a.line} to-transparent`} />
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${a.icon}`}>{icon}</span>
        <div className="leading-tight">
          <div className="text-[15.5px] font-semibold text-ink-100">{title}</div>
          <div className="text-[13px] text-ink-400">{subtitle}</div>
        </div>
        <span className={`ml-auto rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${a.badge}`}>{badge}</span>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

export function Label({ children, right }) {
  return (
    <div className="mb-2 flex items-center justify-between font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-500">
      <span>{children}</span>
      {right}
    </div>
  );
}
