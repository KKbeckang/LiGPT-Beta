import { answerFromDemo, DEMO_MODELS } from '../demo/engine';
import { parseGraphName } from './electrolyte';
import { graphFromRows, isGraph } from './graph';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const isDemoMode = () =>
  import.meta.env.VITE_DEMO === '1' || new URLSearchParams(window.location.search).has('demo');

// Models listed in the server's LLM_MODELS; null when the server cannot be reached.
export async function fetchModels({ demo }) {
  if (demo) return { models: DEMO_MODELS, default: DEMO_MODELS[0] };
  try {
    const res = await fetch(`${API_URL}/models`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function ask(query, { demo, model }) {
  if (demo) {
    await new Promise((resolve) => setTimeout(resolve, 2600));
    return answerFromDemo(query);
  }
  const res = await fetch(`${API_URL}/process-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model ? { query, model } : { query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error || `Server returned ${res.status}`);
  return normalizeResponse(body);
}

// Map the Flask /process-data payload onto the shape the UI renders.
export function normalizeResponse(body) {
  const steps = body.intermediary_steps || [];
  const rows = (steps[1]?.context || []).map(normalizeRow);
  return {
    cypher: (steps[0]?.query || '').trim(),
    rows,
    graph: isGraph(body.graph) ? { ...body.graph, source: 'neo4j' } : graphFromRows(rows, 'derived'),
    kgAnswer: body.answer || '',
    llmAnswer: body.li_gpt_answer || '',
    sources: (body.li_gpt_sources || []).map((s) => ({ ref: s.ref ?? null, page: s.page ?? null, text: s.text || '' })),
    model: body.model || null,
  };
}

const findKey = (row, pattern, type) => Object.keys(row).find((k) => pattern.test(k) && typeof row[k] === type);

// Cypher rows use whatever aliases the LLM picked, so find the columns by name.
function normalizeRow(row) {
  const nameKey = findKey(row, /electrolyte|name/i, 'string') || Object.keys(row).find((k) => typeof row[k] === 'string');
  const ceKey = findKey(row, /coulombic|efficiency|(^|[._])ce$/i, 'number');
  const refKey = findKey(row, /ref/i, 'number');
  const name = nameKey ? row[nameKey] : '';
  return { name, ce: ceKey ? row[ceKey] : null, ref: refKey ? row[refKey] : null, ...parseGraphName(name) };
}
