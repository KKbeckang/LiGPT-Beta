import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CompareTray, ComparePanel } from './components/Compare';
import { DataView } from './components/DataView';
import { Shell } from './components/Header';
import { HowView } from './components/HowView';
import { RecordDrawer } from './components/RecordDrawer';
import { Workspace } from './components/Workspace';
import { DEMO_EXAMPLES } from './demo/engine';
import { ask, fetchModels, isDemoMode } from './lib/api';
import { revealTimeline } from './lib/reveal';
import { useView } from './lib/route';

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

// Recent questions, kept in this browser only.
const RECENT_KEY = 'lithiummind.recent';
function loadRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((q) => typeof q === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}
function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage can be unavailable (private windows); recent questions are a convenience.
  }
}

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
  const [view, navigate] = useView();
  const [drawer, setDrawer] = useState(null);
  const [selected, setSelected] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [recent, setRecent] = useState(loadRecent);

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
    const nextRecent = [q, ...recent.filter((r) => r !== q)].slice(0, 5);
    setRecent(nextRecent);
    saveRecent(nextRecent);
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

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggleSelect = useCallback((id) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])), []);
  const selectMany = useCallback(
    (ids, on) => setSelected((list) => (on ? [...list, ...ids.filter((id) => !list.includes(id))] : list.filter((id) => !ids.includes(id)))),
    [],
  );
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const closeCompare = useCallback(() => setComparing(false), []);
  const askAbout = (question) => {
    setDrawer(null);
    setComparing(false);
    navigate('ask');
    submit(question);
  };
  const goHome = () => {
    reset();
    navigate('ask');
  };

  const header = { demo, onHome: goHome, model, view, onNavigate: navigate };
  let page;
  if (view === 'data') {
    page = (
      <Shell {...header}>
        <DataView onOpen={setDrawer} selected={selectedSet} onToggleSelect={toggleSelect} onSelectMany={selectMany} />
      </Shell>
    );
  } else if (view === 'how') {
    page = (
      <Shell {...header}>
        <HowView onOpen={setDrawer} onNavigate={navigate} />
      </Shell>
    );
  } else {
    page = (
      <Workspace
        demo={demo}
        phase={phase === 'done' ? 'results' : phase}
        query={query}
        onQueryChange={setQuery}
        onSubmit={submit}
        onReset={goHome}
        examples={DEMO_EXAMPLES}
        recent={recent}
        result={result}
        error={error}
        loadingElapsed={loadingElapsed}
        revealElapsed={phase === 'done' ? Infinity : revealElapsed}
        picker={models && { models, value: model, onChange: setModel, open: pickerOpen, onOpenChange: setPickerOpen }}
        onNavigate={navigate}
        onOpen={setDrawer}
      />
    );
  }

  return (
    <>
      {page}
      {!comparing && <CompareTray count={selected.length} onOpen={() => setComparing(true)} onClear={() => setSelected([])} />}
      {comparing && selected.length > 0 && (
        // While a record is open on top, Escape closes only the record.
        <ComparePanel ids={selected} onClose={drawer ? undefined : closeCompare} onOpen={setDrawer} onRemove={toggleSelect} onAsk={askAbout} />
      )}
      <RecordDrawer target={drawer} onClose={closeDrawer} onOpen={setDrawer} selected={selectedSet} onToggleSelect={toggleSelect} onAsk={askAbout} />
    </>
  );
}
