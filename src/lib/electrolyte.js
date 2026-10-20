// Helpers for electrolyte records: { salts: [{name, mol}], solvents: [{name, frac}] }.

const SALT_PATTERN = /^(Li|Na|K|Rb|Cs)[A-Z0-9]/;

// Python-style float text, so names match the ones build_kg.ipynb writes ("7.0 M LiFSI 1.0 % FEC").
const pyFloat = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

// The Electrolyte node name used in the Neo4j graph.
export function graphName({ salts = [], solvents = [] }) {
  const parts = [];
  for (const s of salts) parts.push(s.mol ? `${pyFloat(s.mol)} M ${s.name}` : s.name);
  for (const s of solvents) parts.push(s.frac ? `${pyFloat(s.frac)} % ${s.name}` : s.name);
  return parts.join(' ');
}

// Parse a graph name back into salts and solvents.
export function parseGraphName(name = '') {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  const salts = [];
  const solvents = [];
  for (let i = 0; i < tokens.length; i++) {
    const value = Number(tokens[i]);
    if (!Number.isNaN(value) && tokens[i + 1] === 'M' && tokens[i + 2]) {
      salts.push({ name: tokens[i + 2], mol: value });
      i += 2;
    } else if (!Number.isNaN(value) && tokens[i + 1] === '%' && tokens[i + 2]) {
      solvents.push({ name: tokens[i + 2], frac: value });
      i += 2;
    } else if (Number.isNaN(value)) {
      (SALT_PATTERN.test(tokens[i]) ? salts : solvents).push({ name: tokens[i], mol: null, frac: null });
    }
  }
  return { salts, solvents };
}

// Human-readable label, e.g. "1.2 M LiFSI · DMC/BTFE 33:67".
export function formatElectrolyte({ salts = [], solvents = [] }) {
  const saltText = salts.map((s) => (s.mol ? `${+s.mol} M ${s.name}` : s.name)).join(' + ');
  let solventText = solvents.map((s) => s.name).join('/');
  const fracs = solvents.map((s) => s.frac);
  if (solvents.length > 1 && fracs.every((f) => f)) {
    solventText += ' ' + fracs.map((f) => Math.round(f * 100)).join(':');
  }
  if (saltText && solventText) return `${saltText} · ${solventText}`;
  return saltText || solventText || 'Unspecified electrolyte';
}

export const formatCE = (ce) => (ce == null ? '—' : `${+ce.toFixed(2)} %`);
