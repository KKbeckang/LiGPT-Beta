export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

// Scene windows in seconds; neighbours overlap for the crossfades.
export const SCENES = [
  { id: 'intro', start: 0, end: 6.4 },
  { id: 'pipeline', start: 5.8, end: 15.4 },
  { id: 'graph', start: 14.8, end: 34.4 },
  { id: 'app', start: 33.8, end: 65.8 },
  { id: 'outro', start: 65.2, end: 72.4 },
];

export const DURATION = SCENES[SCENES.length - 1].end;
export const FADE = 0.6;
