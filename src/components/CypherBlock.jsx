import { useMemo } from 'react';
import { CodeIcon } from './Icons';

const KEYWORDS = new Set([
  'MATCH', 'OPTIONAL', 'WHERE', 'RETURN', 'DISTINCT', 'ORDER', 'BY', 'DESC', 'ASC', 'LIMIT', 'AS', 'AND', 'OR', 'NOT',
  'WITH', 'COUNT', 'UNWIND', 'IN', 'CONTAINS', 'COLLECT', 'MAX', 'MIN', 'AVG', 'SIZE', 'EXISTS', 'MERGE', 'CREATE', 'SET',
]);

const COLORS = {
  keyword: 'text-[#7DD3FC]',
  label: 'text-kg-soft',
  string: 'text-salt',
  number: 'text-[#F0ABFC]',
  property: 'text-ink-100',
  ident: 'text-ink-200',
  punct: 'text-ink-500',
  space: '',
};

function tokenize(code) {
  const tokens = [];
  const re = /('[^']*'?)|(:[A-Za-z_][A-Za-z0-9_]*)|(\.[A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(code))) {
    const [text, str, label, prop, word, num, space] = m;
    let type = 'punct';
    if (str) type = 'string';
    else if (label) type = 'label';
    else if (prop) type = 'property';
    else if (word) type = KEYWORDS.has(word.toUpperCase()) ? 'keyword' : 'ident';
    else if (num) type = 'number';
    else if (space) type = 'space';
    tokens.push({ text, type });
  }
  return tokens;
}

// Lines of tokens, cut off after `visible` characters to animate the query being written.
function visibleLines(tokens, visible) {
  const lines = [[]];
  let budget = visible;
  for (const token of tokens) {
    if (budget <= 0) break;
    const text = token.text.slice(0, budget);
    budget -= token.text.length;
    const parts = text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ ...token, text: part });
    });
  }
  return lines;
}

export function CypherBlock({ code, progress = 1 }) {
  const tokens = useMemo(() => tokenize(code), [code]);
  const lineCount = code.split('\n').length;
  const visible = Math.round(code.length * progress);
  const lines = visibleLines(tokens, visible);
  const typing = progress < 1;
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/35">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500">
        <CodeIcon />
        Generated Cypher
      </div>
      <pre className="px-3 py-2.5 font-mono text-[13px] leading-[1.6]">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="flex">
            <span className="w-6 shrink-0 select-none text-right text-ink-600">{i + 1}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap pl-3 [overflow-wrap:anywhere]">
              {(lines[i] || []).map((t, j) => (
                <span key={j} className={COLORS[t.type]}>
                  {t.text}
                </span>
              ))}
              {typing && i === lines.length - 1 && <span className="inline-block h-[1.05em] w-[7px] translate-y-[2px] bg-kg/80" />}
              {'​'}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}
