export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

// Normalised progress of t through [start, end], clamped to 0..1.
export const progress = (t, start, end) => clamp((t - start) / (end - start));

export const lerp = (a, b, k) => a + (b - a) * k;

export const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOutExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
export const easeOutBack = (k) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

// Fade + rise used for most element entrances.
export const enter = (k, distance = 12) => ({
  opacity: k,
  transform: `translateY(${(1 - easeOutCubic(k)) * distance}px)`,
});
