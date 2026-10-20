import { easeInOutCubic, progress } from '../lib/motion';
import { Background } from './parts';
import { AppScene } from './scenes/AppScene';
import { GraphScene } from './scenes/GraphScene';
import { Intro } from './scenes/Intro';
import { Outro } from './scenes/Outro';
import { Pipeline } from './scenes/Pipeline';
import { DURATION, FADE, HEIGHT, SCENES, WIDTH } from './timeline';

const COMPONENTS = { intro: Intro, pipeline: Pipeline, graph: GraphScene, app: AppScene, outro: Outro };

export function Composition({ t }) {
  return (
    <div className="relative overflow-hidden font-sans text-ink-100" style={{ width: WIDTH, height: HEIGHT }}>
      <Background t={t} />
      {SCENES.map((scene) => {
        if (t < scene.start || t > scene.end) return null;
        const local = t - scene.start;
        const dur = scene.end - scene.start;
        const fadeIn = scene.start === 0 ? 1 : easeInOutCubic(progress(local, 0, FADE));
        const fadeOut = scene.end === DURATION ? 1 : 1 - easeInOutCubic(progress(local, dur - FADE, dur));
        const Scene = COMPONENTS[scene.id];
        return (
          <div key={scene.id} className="absolute inset-0" style={{ opacity: fadeIn * fadeOut }}>
            <Scene t={local} dur={dur} />
          </div>
        );
      })}
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: progress(t, DURATION - 0.9, DURATION) }} />
    </div>
  );
}
