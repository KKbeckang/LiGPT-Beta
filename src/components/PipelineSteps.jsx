import { LOADING_STEPS } from '../lib/reveal';
import { CheckIcon } from './Icons';

// `elapsed` drives the pulse of the active step so the animation is a pure function of time.
export function PipelineSteps({ active, done, elapsed = 0 }) {
  const pulse = 0.55 + 0.45 * Math.sin(elapsed * 6);
  return (
    <ol className="flex items-center gap-2">
      {LOADING_STEPS.map((label, i) => {
        const state = done || i < active ? 'done' : i === active ? 'active' : 'todo';
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className={`h-px w-6 ${state === 'todo' ? 'bg-white/10' : 'bg-kg/50'}`} />}
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] ${
                state === 'done'
                  ? 'border-kg/25 bg-kg/10 text-kg-soft'
                  : state === 'active'
                    ? 'border-white/15 bg-white/[0.05] text-ink-100'
                    : 'border-white/[0.06] text-ink-500'
              }`}
            >
              {state === 'done' ? (
                <CheckIcon className="h-3 w-3" />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${state === 'active' ? 'bg-kg' : 'bg-ink-600'}`} style={state === 'active' ? { opacity: pulse } : undefined} />
              )}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
