import { useEffect, useRef } from 'react';
import { modelId, modelLabel, PROVIDER_NAMES, providerOf } from '../lib/models';
import { CheckIcon } from './Icons';

const DOT = { openai: 'bg-solvent', anthropic: 'bg-salt' };

// `open` and `hover` are controlled so the demo video can drive the menu.
export function ModelPicker({ models, value, onChange, open, onOpenChange, demo, hover, size = 'lg' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !ref.current?.contains(event.target)) onOpenChange?.(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open, onOpenChange]);

  if (!models?.length) return null;
  const lg = size === 'lg';
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => onOpenChange?.(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-ink-200 transition hover:border-white/20 hover:text-ink-100 ${lg ? 'h-12 px-3.5 text-[13.5px]' : 'h-9 px-3 text-[12.5px]'}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[providerOf(value)] || 'bg-ink-400'}`} />
        {modelLabel(value)}
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 text-ink-400 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="glass absolute right-0 top-full z-50 mt-2 w-[300px] rounded-2xl p-1.5 text-left shadow-2xl" style={{ background: '#0C1018' }}>
          <div className="px-3 pb-1.5 pt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">Answer with</div>
          {models.map((spec, i) => {
            const selected = spec === value;
            return (
              <button
                key={spec}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange?.(spec);
                  onOpenChange?.(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06] ${hover === i ? 'bg-white/[0.06]' : ''}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[providerOf(spec)] || 'bg-ink-400'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] text-ink-100">{modelLabel(spec)}</span>
                  <span className="block font-mono text-[10.5px] text-ink-500">
                    {PROVIDER_NAMES[providerOf(spec)] || providerOf(spec)} · {modelId(spec)}
                  </span>
                </span>
                {selected && <CheckIcon className="h-3.5 w-3.5 text-kg" />}
              </button>
            );
          })}
          <div className="mt-1 border-t border-white/[0.06] px-3 pb-1.5 pt-2 text-[11px] leading-snug text-ink-500">
            {demo ? 'Demo mode replays recorded answers; with the server running, the picked model writes the Cypher and the answer.' : 'Set the list with LLM_MODELS in the server’s .env.'}
          </div>
        </div>
      )}
    </div>
  );
}
