import { DataView } from '../../components/DataView';
import { Shell } from '../../components/Header';
import { RecordDrawer } from '../../components/RecordDrawer';
import { recordById, STATS } from '../../lib/data';
import { easeInOutCubic, easeOutCubic, lerp, progress } from '../../lib/motion';
import { Caption, Cursor } from '../parts';
import { APP_H, APP_W, CHROME, FRAME_H, TitleBar } from './AppScene';

// The record opened at the end: 7 M LiFSI in FEC, the second row once the table shows LiFSI at 99 % or more.
const RECORD = recordById('47-2');
const NONE = new Set();
const noop = () => {};

// Points in frame coordinates (the app plus its title bar), measured on the page at 1440 x 1012.
const SALT_LABEL = { x: 92, y: 505 + CHROME };
const CE_99 = { x: 954, y: 352 + CHROME };
const TABLE_SCROLL = 560;
const ROW_2 = { x: 420, y: 1215 - TABLE_SCROLL + CHROME };

const T = { saltClick: 4.45, ceClick: 5.45, scroll: [6.9, 7.9], rowClick: 8.8, drawer: [8.9, 9.45] };

const FULL = { x: APP_W / 2, y: FRAME_H / 2, s: 0.93 };
const SHOTS = [
  [0, FULL],
  [6.4, FULL],
  [9.6, FULL],
  [10.4, { x: 1090, y: 420, s: 1.3 }],
  [13.2, { x: 1090, y: 420, s: 1.3 }],
  [14.0, FULL],
];

const CURSOR = [
  [3.2, { x: 700, y: 760 }],
  [4.3, SALT_LABEL],
  [4.7, SALT_LABEL],
  [5.3, CE_99],
  [6.0, CE_99],
  [7.0, { x: 640, y: 560 }],
  [8.0, { x: 640, y: 600 }],
  [8.6, ROW_2],
  [9.3, ROW_2],
  [9.9, { x: 700, y: 900 }],
];
const CLICKS = [
  [T.saltClick - 0.05, T.saltClick + 0.1],
  [T.ceClick - 0.05, T.ceClick + 0.1],
  [T.rowClick - 0.05, T.rowClick + 0.1],
];

function along(keys, l) {
  let i = keys.findIndex(([t]) => t > l);
  if (i === -1) return keys[keys.length - 1][1];
  if (i === 0) return keys[0][1];
  const [t0, a] = keys[i - 1];
  const [t1, b] = keys[i];
  const k = easeInOutCubic(progress(l, t0, t1));
  return Object.fromEntries(Object.keys(a).map((key) => [key, lerp(a[key], b[key], k)]));
}

export function DataScene({ t }) {
  const l = t;
  const cam = along(SHOTS, l);
  const cursor = along(CURSOR, l);
  const enterK = easeOutCubic(progress(l, 0, 1.2));
  const filters = { salt: l >= T.saltClick ? 'LiFSI' : '', minCE: l >= T.ceClick ? 99 : null };
  const scroll = TABLE_SCROLL * easeInOutCubic(progress(l, ...T.scroll));
  const drawer = l >= T.drawer[0] ? easeOutCubic(progress(l, ...T.drawer)) : 0;
  const pressed = CLICKS.some(([a, b]) => l >= a && l < b);
  const cursorOpacity = progress(l, 3.0, 3.3) * (1 - progress(l, 9.6, 10.0));

  return (
    <div className="absolute inset-0">
      <div
        className="absolute left-0 top-0"
        style={{
          width: APP_W,
          height: FRAME_H,
          transformOrigin: '0 0',
          transform: `translate(${960 - cam.x * cam.s}px, ${540 - cam.y * cam.s + (1 - enterK) * 90}px) scale(${cam.s})`,
          opacity: enterK,
        }}
      >
        <div className="absolute -inset-10 rounded-[40px]" style={{ background: 'radial-gradient(closest-side, rgba(56,189,248,0.14), transparent)', filter: 'blur(30px)' }} />
        <div className="relative overflow-hidden rounded-[18px] border border-white/10" style={{ boxShadow: '0 50px 120px -30px rgba(0,0,0,0.85)' }}>
          <TitleBar url="localhost:5173/?demo#/data" />
          <div className="relative overflow-hidden" style={{ width: APP_W, height: APP_H }}>
            <div style={{ transform: `translateY(${-scroll}px)` }}>
              <Shell demo view="data">
                <DataView onOpen={noop} selected={NONE} onToggleSelect={noop} onSelectMany={noop} filters={filters} reveal={progress(l, 0.6, 3.0)} />
              </Shell>
            </div>
            {drawer > 0 && (
              // The transform makes this box, not the video page, the drawer's fixed-position frame.
              <div className="absolute inset-0" style={{ transform: 'translateZ(0)' }}>
                <RecordDrawer target={{ type: 'record', id: RECORD.id }} onClose={noop} onOpen={noop} selected={NONE} onToggleSelect={noop} onAsk={noop} enter={drawer} />
              </div>
            )}
          </div>
        </div>
        <Cursor x={cursor.x} y={cursor.y} pressed={pressed} opacity={cursorOpacity} />
      </div>

      <Caption k={progress(l, 1.4, 1.8) * (1 - progress(l, 4.6, 4.9))} eyebrow="Data" accent="sky">
        All {STATS.withCE} extracted CE values by salt, on a log scale
      </Caption>
      <Caption k={progress(l, 5.7, 6.1) * (1 - progress(l, 8.3, 8.6))} eyebrow="Filter" accent="sky">
        Narrow by salt, solvent, CE or source: here LiFSI at 99 % or more
      </Caption>
      <Caption k={progress(l, 10.3, 10.7) * (1 - progress(l, 13.0, 13.3))} eyebrow="Evidence">
        Every value opens on the passage it came from: {STATS.found + STATS.table} of {STATS.withCE} traced to their paper
      </Caption>
    </div>
  );
}
