import { progress } from './motion';

// Passages listed under the LLM answer; the rest still count for the cross-check.
export const MAX_SOURCES = 5;

export const LOADING_STEPS = ['Generating Cypher', 'Querying the graph', 'Retrieving passages', 'Writing the answer'];
const STEP_SECONDS = 1.1;

// Index of the step shown as active while waiting for the server.
export const activeLoadingStep = (elapsed) => Math.min(LOADING_STEPS.length - 1, Math.floor(elapsed / STEP_SECONDS));

// Times (seconds after the answer arrives) at which each part of the result animates in.
export function revealTimeline(result) {
  const rows = result.rows.length;
  const sources = Math.min(MAX_SOURCES, result.sources.length);
  const llmLength = result.llmAnswer ? result.llmAnswer.length : 0;
  const t = {
    cypher: [0, 1.0],
    graph: [0.4, 1.9],
    rowsStart: 0.7,
    rowStagger: 0.12,
    rowDuration: 0.4,
    kgAnswer: [1.1, 1.6],
    llm: [0.5, 0.5 + llmLength / 150],
  };
  t.rowsEnd = t.rowsStart + t.rowStagger * Math.max(0, rows - 1) + t.rowDuration;
  t.sourcesStart = t.llm[1] + 0.1;
  t.sourcesEnd = t.sourcesStart + 0.1 * Math.max(0, sources - 1) + 0.35;
  const crossStart = Math.max(t.rowsEnd, t.sourcesEnd, t.graph[1]) + 0.15;
  t.cross = [crossStart, crossStart + 0.5];
  t.total = t.cross[1];
  return t;
}

// Progress of every animated part at `elapsed` seconds.
export function revealAt(timeline, elapsed, result) {
  const between = ([a, b]) => progress(elapsed, a, b);
  return {
    cypher: between(timeline.cypher),
    graph: between(timeline.graph),
    rows: result.rows.map((_, i) => {
      const start = timeline.rowsStart + i * timeline.rowStagger;
      return progress(elapsed, start, start + timeline.rowDuration);
    }),
    kgAnswer: between(timeline.kgAnswer),
    llm: between(timeline.llm),
    sources: result.sources.slice(0, MAX_SOURCES).map((_, i) => {
      const start = timeline.sourcesStart + i * 0.1;
      return progress(elapsed, start, start + 0.35);
    }),
    cross: between(timeline.cross),
  };
}
