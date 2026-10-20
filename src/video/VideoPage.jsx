import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Composition } from './Composition';
import { DURATION, FPS, HEIGHT, WIDTH } from './timeline';

// ?capture: time is set frame by frame through window.__setTime (scripts/render-video.mjs).
// ?t=12.5: freeze at one moment. Otherwise the video plays in a loop.
export function VideoPage() {
  const params = new URLSearchParams(window.location.search);
  const capture = params.has('capture');
  const fixed = params.get('t');
  const [t, setT] = useState(fixed ? Number(fixed) : 0);

  useEffect(() => {
    window.__setTime = (value) => flushSync(() => setT(value));
    window.__video = { duration: DURATION, fps: FPS, width: WIDTH, height: HEIGHT };
    if (capture || fixed) return undefined;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      setT(((now - start) / 1000) % DURATION);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [capture, fixed]);

  const scale = capture ? 1 : Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
  return (
    <div style={{ width: WIDTH, height: HEIGHT, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
      <Composition t={t} />
    </div>
  );
}
