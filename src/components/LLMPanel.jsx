import { useMemo } from 'react';
import { enter } from '../lib/motion';
import { MAX_SOURCES } from '../lib/reveal';
import { modelLabel } from '../lib/models';
import { paperShort } from '../lib/data';
import { SparkIcon } from './Icons';
import { Label, Panel } from './Panel';

// Split "... text [12] more text" into text and citation segments.
function segment(text) {
  return text.split(/(\[\d+\])/).filter(Boolean).map((part) => {
    const cite = part.match(/^\[(\d+)\]$/);
    return cite ? { type: 'cite', ref: Number(cite[1]), length: part.length } : { type: 'text', text: part, length: part.length };
  });
}

function StreamedAnswer({ text, k }) {
  const segments = useMemo(() => segment(text), [text]);
  let budget = Math.round(text.length * k);
  const out = [];
  for (const [i, s] of segments.entries()) {
    if (budget <= 0) break;
    if (s.type === 'cite') {
      out.push(
        <span key={i} className="mx-0.5 inline-flex -translate-y-px items-center rounded-md bg-llm/15 px-1.5 py-px font-mono text-[11px] text-llm-soft">
          {s.ref}
        </span>,
      );
    } else {
      out.push(<span key={i}>{s.text.slice(0, budget)}</span>);
    }
    budget -= s.length;
  }
  return (
    <p className="text-[16px] leading-[1.75] text-ink-100">
      {out}
      {k < 1 && <span className="ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[3px] rounded-[1px] bg-llm" />}
    </p>
  );
}

// Emphasise percentages in a quoted passage.
function Passage({ text }) {
  return text.split(/(~?\s?\d+(?:\.\d+)?\s?%)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="font-medium text-llm-soft">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function LLMPanel({ result, reveal, style, onOpen }) {
  return (
    <Panel
      accent="llm"
      icon={<SparkIcon />}
      title="LiGPT"
      subtitle={`${result.model ? modelLabel(result.model) : result.llmAnswer ? 'Recorded demo answer' : 'Demo mode'} · RAG over 71 papers`}
      badge="Contextual"
      style={style}
    >
      {result.llmAnswer ? (
        <StreamedAnswer text={result.llmAnswer} k={reveal.llm} />
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14.5px] leading-relaxed text-ink-300">
          {result.llmNote || 'The LLM returned no answer.'}
        </p>
      )}
      {result.sources.length > 0 && (
        <div>
          <div style={enter(reveal.sources[0], 4)}>
            <Label right={<span>MaterialsBERT + BioBERT retrieval</span>}>Retrieved passages · {result.sources.length}</Label>
          </div>
          <ul className="space-y-2">
            {result.sources.slice(0, MAX_SOURCES).map((s, i) => (
              <li key={i} style={enter(reveal.sources[i], 8)} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onOpen({ type: 'paper', ref: s.ref })}
                  disabled={!onOpen || s.ref == null}
                  title={s.ref == null ? undefined : paperShort(s.ref)}
                  className="mt-0.5 h-fit shrink-0 whitespace-nowrap rounded-md bg-llm/15 px-1.5 py-0.5 font-mono text-[11.5px] text-llm-soft transition enabled:hover:bg-llm/30"
                >
                  Ref. {s.ref ?? '?'}
                </button>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] text-ink-500">
                    {[s.ref != null && paperShort(s.ref), s.page != null && `p.${s.page}`].filter(Boolean).join(' · ')}
                  </div>
                  <p className="line-clamp-2 text-[13.5px] leading-relaxed text-ink-300">
                    <Passage text={s.text} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {result.sources.length > MAX_SOURCES && (
            <p className="mt-2 font-mono text-[12px] text-ink-500">+{result.sources.length - MAX_SOURCES} more passages used for the cross-check</p>
          )}
        </div>
      )}
    </Panel>
  );
}
