// Periodic-table tile for lithium: atomic number 3, symbol Li, mass 6.94.
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="logo-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="0.5" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="logo-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141B28" />
          <stop offset="1" stopColor="#0A0E16" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#logo-fill)" stroke="url(#logo-stroke)" strokeWidth="1.5" />
      <text x="7" y="12" fontSize="7" fill="#7A859A" fontFamily="JetBrains Mono, monospace">3</text>
      <text x="20" y="27.5" fontSize="15" fontWeight="650" textAnchor="middle" fill="#E8ECF3" fontFamily="Inter Variable, Inter, sans-serif">
        Li
      </text>
      <text x="20" y="35" fontSize="5.5" textAnchor="middle" fill="#7A859A" fontFamily="JetBrains Mono, monospace">6.94</text>
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-ink-100">LithiumMind</div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400">LiGPT · battery Q/A</div>
      </div>
    </div>
  );
}
