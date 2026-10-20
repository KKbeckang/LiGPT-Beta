import { useMemo } from 'react';
import { crossCheck } from '../lib/crosscheck';
import { isGraph } from '../lib/graph';
import { enter, progress } from '../lib/motion';
import { activeLoadingStep, revealAt, revealTimeline } from '../lib/reveal';
import { CrossCheck } from './CrossCheck';
import { Header } from './Header';
import { Hero } from './Hero';
import { KnowledgeGraphPanel } from './KnowledgeGraphPanel';
import { LLMPanel } from './LLMPanel';
import { ModelPicker } from './ModelPicker';
import { PipelineSteps } from './PipelineSteps';
import { ResultGraphSection } from './ResultGraph';
import { QueryBox } from './QueryBox';

function Shimmer({ elapsed, className, style }) {
  const x = ((elapsed * 0.9) % 1) * 300 - 100;
  return (
    <div style={style} className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className}`}>
      <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" style={{ left: `${x}%` }} />
    </div>
  );
}

function LoadingPanels({ elapsed }) {
  const panel = (accent) => (
    <div className="glass rounded-[20px] p-5" style={enter(progress(elapsed, 0, 0.35), 12)}>
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg ${accent}`} />
        <div className="space-y-1.5">
          <Shimmer elapsed={elapsed} className="h-3 w-32" />
          <Shimmer elapsed={elapsed} className="h-2.5 w-44" />
        </div>
      </div>
      <Shimmer elapsed={elapsed} className="mt-6 h-36 w-full" />
      <div className="mt-5 space-y-2.5">
        {[0.92, 0.84, 0.88, 0.7, 0.78].map((w, i) => (
          <Shimmer key={i} elapsed={elapsed + i * 0.08} className="h-3.5" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
      {panel('bg-kg/15')}
      {panel('bg-llm/15')}
    </div>
  );
}

// graphElapsed lets the demo video start the graph animation when the camera reaches it.
function Results({ result, elapsed, graphElapsed }) {
  const timeline = useMemo(() => revealTimeline(result), [result]);
  const check = useMemo(() => crossCheck(result.rows, result.sources), [result]);
  const citedRefs = useMemo(() => new Set(result.sources.map((s) => s.ref)), [result]);
  const confirmed = useMemo(() => new Set(check.items.filter((i) => i.status === 'confirmed').map((i) => `${i.ref}|${i.ce}`)), [check]);
  const reveal = revealAt(timeline, elapsed, result);
  const graphProgress = graphElapsed == null ? reveal.graph : progress(graphElapsed, 0, timeline.graph[1] - timeline.graph[0]);
  const highlight = graphElapsed == null ? reveal.cross : progress(graphElapsed, 2.4, 3.0);
  const crossProgress = graphElapsed == null ? reveal.cross : progress(graphElapsed, 3.4, 4.0);
  const panelIn = enter(progress(elapsed, 0, 0.35), 14);
  return (
    <>
      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <KnowledgeGraphPanel result={result} reveal={reveal} style={panelIn} />
        <LLMPanel result={result} reveal={reveal} style={panelIn} />
      </div>
      {isGraph(result.graph) && (
        <div className="mt-5">
          <ResultGraphSection
            graph={result.graph}
            progress={graphProgress}
            highlight={highlight}
            citedRefs={citedRefs}
            confirmed={confirmed}
            style={enter(Math.min(1, graphProgress * 4), 14)}
          />
        </div>
      )}
      {check.items.length > 0 && result.sources.length > 0 && (
        <div className="mt-5">
          <CrossCheck check={check} progress={crossProgress} />
        </div>
      )}
    </>
  );
}

function ErrorCard({ error, demo }) {
  return (
    <div className="glass mt-5 rounded-2xl px-6 py-5">
      <div className="text-[14px] font-semibold text-ink-100">The server could not answer this question.</div>
      <p className="mt-1 font-mono text-[12.5px] text-[#FCA5A5]">{error}</p>
      {!demo && (
        <p className="mt-3 text-[13px] text-ink-300">
          Start the Flask server in <code className="font-mono text-ink-100">src/service/front_end</code>, or open{' '}
          <a href="?demo" className="text-kg underline-offset-2 hover:underline">
            demo mode
          </a>
          .
        </p>
      )}
    </div>
  );
}

// The whole page as a function of its state. The app drives it from user input and the server;
// the demo video drives it from a timeline.
export function Workspace({
  demo,
  phase,
  query,
  onQueryChange,
  onSubmit,
  onReset,
  examples,
  result,
  error,
  loadingElapsed = 0,
  revealElapsed = Infinity,
  graphElapsed = null,
  readOnly = false,
  caret = false,
  pressed = false,
  picker,
}) {
  const pickerFor = (size) => picker && <ModelPicker {...picker} size={size} demo={demo} />;
  return (
    <div className="bg-aurora relative min-h-screen overflow-hidden">
      <div className="bg-dots pointer-events-none absolute inset-0" />
      <Header demo={demo} onHome={onReset} model={picker?.value} />
      <main className="relative z-10 px-8 pb-10">
        {phase === 'hero' ? (
          <Hero
            query={query}
            onQueryChange={onQueryChange}
            onSubmit={onSubmit}
            examples={examples}
            onExample={onSubmit}
            readOnly={readOnly}
            caret={caret}
            pressed={pressed}
            picker={pickerFor('lg')}
          />
        ) : (
          <div className="mx-auto max-w-[1360px] pt-2">
            <QueryBox
              size="sm"
              value={query}
              onChange={onQueryChange}
              onSubmit={onSubmit}
              readOnly={readOnly}
              busy={phase === 'loading'}
              picker={pickerFor('sm')}
            />
            <div className="mt-3 flex items-center justify-between">
              <PipelineSteps active={activeLoadingStep(loadingElapsed)} done={phase === 'results'} elapsed={loadingElapsed} />
              {phase === 'results' && (
                <span className="font-mono text-[11px] text-ink-500">
                  {result.rows.length} graph rows · {result.sources.length} passages
                </span>
              )}
            </div>
            {phase === 'loading' && <LoadingPanels elapsed={loadingElapsed} />}
            {phase === 'results' && <Results result={result} elapsed={revealElapsed} graphElapsed={graphElapsed} />}
            {phase === 'error' && <ErrorCard error={error} demo={demo} />}
          </div>
        )}
      </main>
    </div>
  );
}
