import { LogoMark } from '../../components/Logo';
import { easeOutBack, easeOutCubic, progress } from '../../lib/motion';

const TEAM = ['Xinyi Ni', 'Zizhang Chen', 'Rongda Kang', 'Sheng-Lun (Mark) Liao', 'Pengyu Hong', 'Sandeep R. Madireddy'];
const FEATURES = ['Neo4j knowledge graph', 'OpenAI + Anthropic models', 'Answers cross-checked against sources'];

export function Outro({ t }) {
  const logo = easeOutBack(progress(t, 0.2, 0.9));
  const title = easeOutCubic(progress(t, 0.5, 1.2));
  const fade = (a, b) => ({ opacity: easeOutCubic(progress(t, a, b)), transform: `translateY(${(1 - easeOutCubic(progress(t, a, b))) * 18}px)` });
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <div style={{ transform: `scale(${logo})`, opacity: Math.min(1, logo) }}>
        <LogoMark size={116} />
      </div>
      <div className="mt-8 text-[104px] font-semibold leading-none tracking-[-0.045em] text-ink-100" style={{ opacity: title, filter: `blur(${(1 - title) * 12}px)` }}>
        Lithium<span className="text-gradient">Mind</span>
      </div>
      <div className="mt-6 text-[30px] text-ink-300" style={fade(1.0, 1.6)}>
        Structured facts and grounded answers for electrolyte design
      </div>
      <div className="mt-9 flex gap-3" style={fade(1.4, 2.0)}>
        {FEATURES.map((f) => (
          <span key={f} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-[18px] text-ink-200">
            {f}
          </span>
        ))}
      </div>
      <div className="mt-12 text-[19px] text-ink-400" style={fade(2.0, 2.6)}>
        {TEAM.join('  ·  ')}
      </div>
      <div className="mt-6 flex gap-4 font-mono text-[17px]" style={fade(2.4, 3.0)}>
        <span className="rounded-lg border border-kg/30 bg-kg/10 px-4 py-1.5 text-kg-soft">arXiv:2411.15221</span>
        <span className="rounded-lg border border-llm/30 bg-llm/10 px-4 py-1.5 text-llm-soft">github.com/KKbeckang/LiGPT-Beta</span>
      </div>
    </div>
  );
}
