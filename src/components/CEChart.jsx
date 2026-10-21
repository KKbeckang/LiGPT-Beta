import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { lce, paperShort } from '../lib/data';
import { clamp, easeOutBack } from '../lib/motion';
import { formatCE } from '../lib/electrolyte';

const TICKS = [50, 80, 90, 95, 98, 99, 99.5, 99.8, 99.9];
const ROW = 46;
const LABEL_W = 150;
const PAD = { top: 10, right: 28, bottom: 40 };
const R = 5;
const MAX_LCE = 3.1;

const scaleX = (ce, plotW) => LABEL_W + (lce(ce) / MAX_LCE) * plotW;

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

// Rows of salts, most records first; salts with a single record share an "Other salts" row.
function rowsFor(records) {
  const groups = new Map();
  for (const r of records) {
    if (r.ce == null) continue;
    if (!groups.has(r.mainSalt)) groups.set(r.mainSalt, []);
    groups.get(r.mainSalt).push(r);
  }
  const rows = [];
  const other = [];
  let none = null;
  for (const [salt, list] of groups) {
    if (salt === 'No salt listed') none = { salt, label: salt, list };
    else if (list.length > 1) rows.push({ salt, label: salt, list });
    else other.push(...list);
  }
  rows.sort((a, b) => b.list.length - a.list.length);
  if (other.length) rows.push({ salt: null, label: 'Other salts', list: other });
  if (none) rows.push(none);
  return rows;
}

// Stack dots that would overlap into alternating lanes above and below the row's centre line.
function lanes(points) {
  const placed = [];
  const order = [0, -1, 1, -2, 2, -3, 3];
  for (const p of [...points].sort((a, b) => a.x - b.x)) {
    const lane = order.find((l) => !placed.some((q) => q.lane === l && Math.abs(q.x - p.x) < R * 2 + 1.5)) ?? 0;
    placed.push({ ...p, lane });
  }
  return placed;
}

// Coulombic efficiency of every record on a log scale (−log10(1 − CE)), one row per main salt.
// Filled dots: value traced to the paper text; hollow: not found. Records outside the filters are faint.
// reveal sweeps the dots in from the left (the demo video animates it); the app shows them all.
export function CEChart({ records, visible, onOpen, onSalt, activeSalt, reveal = 1 }) {
  const box = useRef(null);
  const width = useWidth(box);
  const [hover, setHover] = useState(null);
  const rows = useMemo(() => rowsFor(records), [records]);
  const plotW = Math.max(0, width - LABEL_W - PAD.right);
  const x = (ce) => scaleX(ce, plotW);
  const height = PAD.top + rows.length * ROW + PAD.bottom;

  const dots = useMemo(
    () =>
      rows.flatMap((row, i) =>
        lanes(row.list.map((r) => ({ r, x: scaleX(r.ce, plotW) }))).map((d) => ({
          ...d,
          y: PAD.top + i * ROW + ROW / 2 + d.lane * (R + 1.5),
          on: visible.has(d.r.id),
        })),
      ),
    [rows, visible, plotW],
  );

  return (
    <div ref={box} className="relative">
      {width > 0 && (
        <svg width={width} height={height} className="block" onPointerLeave={() => setHover(null)}>
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={PAD.top} y2={height - PAD.bottom} stroke="rgba(255,255,255,0.07)" />
              <text x={x(t)} y={height - PAD.bottom + 20} textAnchor="middle" className="fill-ink-400 font-mono text-[12px]">
                {t}
              </text>
            </g>
          ))}
          <text x={LABEL_W + plotW} y={height - 4} textAnchor="end" className="fill-ink-500 text-[12px]">
            Coulombic efficiency, % (log scale: −log₁₀(1 − CE))
          </text>
          {rows.map((row, i) => {
            const y = PAD.top + i * ROW;
            const active = row.salt && row.salt === activeSalt;
            return (
              <g key={row.label}>
                {i > 0 && <line x1={0} x2={LABEL_W + plotW} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" />}
                <text
                  x={0}
                  y={y + ROW / 2 + 5}
                  onClick={() => row.salt && onSalt(active ? '' : row.salt)}
                  className={`text-[14px] ${row.salt ? 'cursor-pointer' : ''} ${active ? 'fill-kg-soft font-semibold' : 'fill-ink-200'}`}
                >
                  {row.label}
                  <tspan className="fill-ink-500 font-mono text-[12px]" dx={8}>
                    {row.list.length}
                  </tspan>
                </text>
              </g>
            );
          })}
          {dots
            .slice()
            .sort((a, b) => a.on - b.on)
            .map((d) => {
              const traced = d.r.evidence.status === 'found' || d.r.evidence.status === 'table';
              const isHover = hover?.r.id === d.r.id;
              const k = reveal >= 1 ? 1 : clamp((reveal * 1.25 - (d.x - LABEL_W) / plotW) / 0.25);
              if (k <= 0) return null;
              return (
                <g
                  key={d.r.id}
                  className="cursor-pointer"
                  onPointerEnter={() => setHover(d)}
                  onClick={() => onOpen({ type: 'record', id: d.r.id })}
                >
                  <circle cx={d.x} cy={d.y} r={12} fill="transparent" />
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={(isHover ? R + 1.5 : d.on ? R : 3) * easeOutBack(k)}
                    fill={d.on ? (traced ? '#2DD4BF' : '#0B0F17') : 'rgba(162,172,190,0.22)'}
                    stroke={d.on ? (traced ? '#0B0F17' : '#2DD4BF') : 'none'}
                    strokeWidth={traced ? 2 : 1.8}
                  />
                </g>
              );
            })}
        </svg>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-[300px] rounded-xl border border-white/10 bg-[#0C1018] px-3.5 py-2.5 shadow-2xl"
          style={{ left: Math.min(hover.x + 14, width - 310), top: hover.y + 14 }}
        >
          <div className="text-[17px] font-semibold text-ink-100">{formatCE(hover.r.ce)}</div>
          <div className="mt-0.5 text-[13.5px] text-ink-200">{hover.r.label}</div>
          <div className="mt-1 text-[12.5px] text-ink-400">
            {paperShort(hover.r.ref)} · Ref. {hover.r.ref}
            {hover.r.evidence.page ? ` · p.${hover.r.evidence.page}` : ' · not found in text'}
          </div>
        </div>
      )}
    </div>
  );
}
