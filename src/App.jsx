import { useEffect, useMemo, useRef, useState } from 'react';
import { Workspace } from './components/Workspace';
import { DEMO_EXAMPLES } from './demo/engine';
import { ask, fetchModels, isDemoMode } from './lib/api';
import { revealTimeline } from './lib/reveal';

// performance.now(), refreshed every animation frame while `active`.
function useAnimationClock(active) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) return undefined;
    let frame = requestAnimationFrame(function tick(t) {
      setNow(t);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const demo = useMemo(isDemoMode, []);
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('hero');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [answeredAt, setAnsweredAt] = useState(0);
  const requestId = useRef(0);
  const [models, setModels] = useState(null);
  const [model, setModel] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    fetchModels({ demo }).then((list) => {
      if (!list) return;
      setModels(list.models);
      setModel(list.default);
    });
  }, [demo]);

  const revealSeconds = useMemo(() => (result ? revealTimeline(result).total : 0), [result]);
  const now = useAnimationClock(phase === 'loading' || phase === 'results');
  const revealElapsed = prefersReducedMotion() ? Infinity : (now - answeredAt) / 1000;
  const loadingElapsed = Math.max(0, (now - startedAt) / 1000);

  // Stop the clock once the reveal has finished.
  const settled = phase === 'results' && revealElapsed > revealSeconds + 0.2;
  useEffect(() => {
    if (settled) setPhase('done');
  }, [settled]);

  const submit = (q) => {
    const id = ++requestId.current;
    setQuery(q);
    setError('');
    setPhase('loading');
    setStartedAt(performance.now());
    ask(q, { demo, model })
      .then((r) => {
        if (id !== requestId.current) return;
        setResult(r);
        setAnsweredAt(performance.now());
        setPhase('results');
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(e.message);
        setPhase('error');
      });
  };

  const reset = () => {
    requestId.current++;
    setPhase('hero');
    setQuery('');
    setResult(null);
  };

  return (
    <Workspace
      demo={demo}
      phase={phase === 'done' ? 'results' : phase}
      query={query}
      onQueryChange={setQuery}
      onSubmit={submit}
      onReset={reset}
      examples={DEMO_EXAMPLES}
      result={result}
      error={error}
      loadingElapsed={loadingElapsed}
      revealElapsed={phase === 'done' ? Infinity : revealElapsed}
      picker={models && { models, value: model, onChange: setModel, open: pickerOpen, onOpenChange: setPickerOpen }}
    />
  );
}
