import { clamp, easeOutCubic } from '../lib/motion';

export function Background({ t }) {
  const dx = Math.sin(t * 0.12) * 70;
  const dy = Math.cos(t * 0.09) * 45;
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#04060A' }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(900px 620px at ${380 + dx}px ${110 + dy}px, rgba(45,212,191,0.15), transparent 65%),
            radial-gradient(940px 660px at ${1560 - dx}px ${150 - dy}px, rgba(167,139,250,0.17), transparent 65%),
            radial-gradient(1300px 520px at 960px ${1200 + dy}px, rgba(56,189,248,0.08), transparent 70%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.075) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: `${(t * 6) % 32}px ${(t * 3) % 32}px`,
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, black 25%, transparent 80%)',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)' }} />
    </div>
  );
}

// Lower-third caption. k: 0 hidden, 1 shown.
export function Caption({ k, eyebrow, children, accent = 'kg', y = 958 }) {
  if (k <= 0) return null;
  const e = easeOutCubic(clamp(k));
  const color = accent === 'kg' ? '#2DD4BF' : accent === 'llm' ? '#A78BFA' : '#7DD3FC';
  return (
    <div className="absolute left-0 right-0 flex justify-center" style={{ top: y, opacity: e, transform: `translateY(${(1 - e) * 18}px)` }}>
      <div className="glass flex items-center gap-4 rounded-2xl px-6 py-3.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
        <span className="font-mono text-[15px] uppercase tracking-[0.16em]" style={{ color }}>
          {eyebrow}
        </span>
        <span className="h-4 w-px bg-white/15" />
        <span className="text-[23px] text-ink-100">{children}</span>
      </div>
    </div>
  );
}

export function SectionTitle({ k, index, eyebrow, title, x = 110, y = 96 }) {
  const e = easeOutCubic(clamp(k));
  return (
    <div className="absolute whitespace-nowrap" style={{ left: x, top: y, opacity: e, transform: `translateY(${(1 - e) * 20}px)` }}>
      <div className="font-mono text-[17px] uppercase tracking-[0.2em] text-kg">
        {index} · {eyebrow}
      </div>
      <div className="mt-3 text-[50px] font-semibold leading-tight tracking-[-0.03em] text-ink-100">{title}</div>
    </div>
  );
}

export function Cursor({ x, y, pressed = false, opacity = 1 }) {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      className="absolute"
      style={{ left: x - 4, top: y - 2, opacity, transform: `scale(${pressed ? 0.88 : 1})`, transformOrigin: '4px 2px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
    >
      <path d="M4 2.5v16.2l4.3-4.1 2.8 6.4 2.9-1.3-2.8-6.3h6z" fill="#F8FAFC" stroke="#0B0F17" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function CountUp({ value, k, decimals = 0 }) {
  const v = value * easeOutCubic(clamp(k));
  return <>{v.toFixed(decimals)}</>;
}
