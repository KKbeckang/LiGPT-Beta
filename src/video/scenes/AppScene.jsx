import { useMemo } from 'react';
import { Workspace } from '../../components/Workspace';
import { answerFromDemo, DEMO_EXAMPLES, DEMO_MODELS } from '../../demo/engine';
import { crossCheck } from '../../lib/crosscheck';
import { easeInOutCubic, easeOutCubic, lerp, progress } from '../../lib/motion';
import { Caption, Cursor } from '../parts';

const QUESTION = DEMO_EXAMPLES[0];
const APP_W = 1440;
const APP_H = 1012;
const CHROME = 40;
const FRAME_H = APP_H + CHROME;

// Points in frame coordinates (the app plus its title bar).
const PILL = { x: 919, y: 514 + CHROME };
const MENU_ITEMS = [611, 667, 723].map((y) => ({ x: 860, y: y + CHROME }));
const INPUT = { x: 560, y: 514 + CHROME };
const ASK = { x: 1050, y: 514 + CHROME };

const T = {
  open: 2.2,
  close: 4.55,
  typeStart: 4.7,
  typeEnd: 7.2,
  click: 7.8,
  submit: 7.95,
  answer: 10.55,
};

// Camera keyframes: time, focus point (frame coordinates) and scale.
const FULL = { x: APP_W / 2, y: FRAME_H / 2, s: 0.93 };
const SHOTS = [
  [0, FULL],
  [2.0, { x: 760, y: 560, s: 1.12 }],
  [7.6, { x: 760, y: 560, s: 1.12 }],
  [8.6, FULL],
  [16.4, FULL],
  [17.4, { x: 375, y: 625, s: 1.22 }],
  [19.3, { x: 375, y: 625, s: 1.22 }],
  [20.2, { x: 1065, y: 560, s: 1.25 }],
  [22.0, { x: 1065, y: 560, s: 1.25 }],
  [22.9, { x: 720, y: 790, s: 1.3 }],
  [24.5, { x: 720, y: 790, s: 1.3 }],
  [25.6, FULL],
];

function cameraAt(l) {
  let i = SHOTS.findIndex(([t]) => t > l);
  if (i === -1) return SHOTS[SHOTS.length - 1][1];
  if (i === 0) return SHOTS[0][1];
  const [t0, a] = SHOTS[i - 1];
  const [t1, b] = SHOTS[i];
  const k = easeInOutCubic(progress(l, t0, t1));
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k) };
}

// Cursor path: [time, point]; pressed between the listed click windows.
const CURSOR = [
  [1.0, { x: 1180, y: 820 }],
  [2.0, PILL],
  [2.6, PILL],
  [2.9, MENU_ITEMS[1]],
  [3.5, MENU_ITEMS[1]],
  [3.8, MENU_ITEMS[2]],
  [4.2, MENU_ITEMS[2]],
  [4.5, INPUT],
  [7.3, INPUT],
  [7.75, ASK],
  [9.2, ASK],
  [9.9, { x: 1240, y: 860 }],
];
const CLICKS = [
  [2.05, 2.2],
  [4.45, 4.6],
  [7.8, 7.95],
];

function cursorAt(l) {
  let i = CURSOR.findIndex(([t]) => t > l);
  if (i === -1) return CURSOR[CURSOR.length - 1][1];
  if (i === 0) return CURSOR[0][1];
  const [t0, a] = CURSOR[i - 1];
  const [t1, b] = CURSOR[i];
  const k = easeInOutCubic(progress(l, t0, t1));
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
}

function TitleBar() {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.07] px-4" style={{ height: CHROME, background: '#0B0F17' }}>
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
        <span key={c} className="h-3 w-3 rounded-full" style={{ background: c, opacity: 0.85 }} />
      ))}
      <div className="mx-auto flex h-6 w-[420px] items-center justify-center rounded-md bg-white/[0.05] font-mono text-[12px] text-ink-400">
        localhost:5173/?demo
      </div>
      <span className="w-[52px]" />
    </div>
  );
}

export function AppScene({ t }) {
  const l = t;
  const result = useMemo(() => answerFromDemo(QUESTION), []);
  const check = useMemo(() => crossCheck(result.rows, result.sources), [result]);

  const phase = l < T.submit ? 'hero' : l < T.answer ? 'loading' : 'results';
  const typed = QUESTION.slice(0, Math.round(QUESTION.length * progress(l, T.typeStart, T.typeEnd)));
  const open = l >= T.open && l < T.close;
  const hover = l >= 2.9 && l < 3.8 ? 1 : l >= 3.8 && l < T.close ? 2 : null;
  const caret = phase === 'hero' && l >= T.close && (l < T.typeEnd + 0.1 || Math.floor(l * 2.2) % 2 === 0);

  const cam = cameraAt(l);
  const enterK = easeOutCubic(progress(l, 0, 1.2));
  const cursor = cursorAt(l);
  const pressed = CLICKS.some(([a, b]) => l >= a && l < b);
  const cursorOpacity = progress(l, 0.9, 1.2) * (1 - progress(l, 9.6, 10.0));

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
        <div className="absolute -inset-10 rounded-[40px]" style={{ background: 'radial-gradient(closest-side, rgba(45,212,191,0.16), transparent)', filter: 'blur(30px)' }} />
        <div
          className="relative overflow-hidden rounded-[18px] border border-white/10"
          style={{ boxShadow: '0 50px 120px -30px rgba(0,0,0,0.85)', transform: `perspective(2200px) rotateX(${(1 - enterK) * 12}deg)`, transformOrigin: '50% 0' }}
        >
          <TitleBar />
          <div className="relative overflow-hidden" style={{ width: APP_W, height: APP_H }}>
            <Workspace
              demo
              phase={phase}
              query={phase === 'hero' ? typed : QUESTION}
              examples={DEMO_EXAMPLES}
              result={result}
              loadingElapsed={Math.max(0, l - T.submit)}
              revealElapsed={l - T.answer}
              readOnly
              caret={caret}
              pressed={l >= 7.8 && l < 7.95}
              picker={{ models: DEMO_MODELS, value: DEMO_MODELS[0], open, hover }}
            />
          </div>
        </div>
        <Cursor x={cursor.x} y={cursor.y} pressed={pressed} opacity={cursorOpacity} />
      </div>

      <Caption k={progress(l, 2.5, 2.9) * (1 - progress(l, 4.5, 4.8))} eyebrow="Any model" accent="sky">
        Pick any model the server lists in LLM_MODELS: OpenAI or Anthropic, per question
      </Caption>
      <Caption k={progress(l, T.answer + 0.4, T.answer + 0.8) * (1 - progress(l, 16.0, 16.3))} eyebrow="Dual output">
        One question, two answers side by side: graph facts and an LLM answer
      </Caption>
      <Caption k={progress(l, 17.5, 17.9) * (1 - progress(l, 19.2, 19.5))} eyebrow="Knowledge graph">
        Cypher → Neo4j → ranked CE facts, each with its source paper
      </Caption>
      <Caption k={progress(l, 20.3, 20.7) * (1 - progress(l, 21.9, 22.2))} eyebrow="LLM + RAG" accent="llm">
        The model explains why, citing the passages it retrieved
      </Caption>
      <Caption k={progress(l, 23.0, 23.4) * (1 - progress(l, 24.4, 24.7))} eyebrow="Cross-check">
        {check.confirmed} of {check.items.length} graph CE values found verbatim in the retrieved source passages
      </Caption>
    </div>
  );
}
