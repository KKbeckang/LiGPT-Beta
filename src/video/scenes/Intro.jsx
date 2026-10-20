import { clamp, easeInOutCubic, easeOutBack, easeOutCubic, progress } from '../../lib/motion';

const TITLE = 'LithiumMind';
// Per-letter colours for "Mind": teal → sky → violet.
const MIND = ['#5EEAD4', '#7DD3FC', '#A5B4FC', '#C4B5FD'];

function Atom({ t, k, out }) {
  const draw = easeInOutCubic(progress(t, 0.3, 1.7));
  const rx = 230;
  const ry = 76;
  const perimeter = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
  return (
    <svg width="1920" height="1080" className="absolute inset-0">
      <defs>
        <radialGradient id="nucleus" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#7EE8D8" />
          <stop offset="0.55" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#6D28D9" />
        </radialGradient>
        <radialGradient id="halo" r="50%">
          <stop offset="0" stopColor="#2DD4BF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#2DD4BF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orbit" x1="0" x2="1">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
        <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform={`translate(960 390) scale(${(0.55 + 0.45 * easeOutBack(k)) * (1 + out * 1.8)})`} opacity={clamp(k) * (1 - out)}>
        <circle r="200" fill="url(#halo)" />
        {[0, 60, 120].map((rot, i) => {
          const a = t * (1.05 + i * 0.22) + i * 2.1;
          return (
            <g key={rot} transform={`rotate(${rot})`}>
              <ellipse rx={rx} ry={ry} fill="none" stroke="url(#orbit)" strokeWidth="1.6" opacity="0.5" strokeDasharray={perimeter} strokeDashoffset={perimeter * (1 - draw)} />
              <circle cx={rx * Math.cos(a)} cy={ry * Math.sin(a)} r="7" fill="#CFFAFE" filter="url(#glow)" opacity={draw} />
            </g>
          );
        })}
        <circle r="58" fill="url(#nucleus)" filter="url(#glow)" />
        <text y="17" textAnchor="middle" fontSize="50" fontWeight="700" fill="#04060A" fontFamily="Inter Variable, Inter, sans-serif">
          Li
        </text>
      </g>
    </svg>
  );
}

export function Intro({ t, dur }) {
  const out = easeInOutCubic(progress(t, dur - 1.5, dur));
  return (
    <div className="absolute inset-0">
      <Atom t={t} k={progress(t, 0.1, 1.3)} out={out} />
      <div className="absolute left-0 right-0 text-center" style={{ top: 610, opacity: 1 - out, transform: `translateY(${-out * 40}px)` }}>
        <div className="text-[128px] font-semibold leading-none tracking-[-0.045em]">
          {TITLE.split('').map((ch, i) => {
            const k = easeOutCubic(progress(t, 0.9 + i * 0.055, 1.6 + i * 0.055));
            return (
              <span
                key={i}
                className="inline-block"
                style={{
                  color: i < 7 ? '#E8ECF3' : MIND[i - 7],
                  opacity: k,
                  transform: `translateY(${(1 - k) * 46}px)`,
                  filter: `blur(${(1 - k) * 14}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div className="mt-7 text-[32px] text-ink-300" style={{ opacity: easeOutCubic(progress(t, 1.9, 2.6)) }}>
          Language models for lithium metal battery electrolyte design
        </div>
        <div className="mt-8 flex justify-center" style={{ opacity: easeOutCubic(progress(t, 2.5, 3.1)) }}>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 font-mono text-[16px] uppercase tracking-[0.18em] text-ink-400">
            LLM Hackathon for Applications in Materials Science &amp; Chemistry · 2024
          </span>
        </div>
      </div>
    </div>
  );
}
