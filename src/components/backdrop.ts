import { Brand } from '@/constants/theme';

/** A backdrop gradient stop: [position 0–1, r, g, b, alpha], painted over Brand.surface. */
export type BackdropStop = readonly [number, number, number, number, number];

/** The app's standard green-tinted backdrop, used by the menu and onboarding screens. */
export const BACKDROP_STOPS: readonly BackdropStop[] = [
  [0, 55, 135, 101, 0.61],
  [0.3, 245, 247, 246, 0.01],
  [0.6, 223, 234, 229, 0.44],
  [1, 55, 135, 101, 0.53],
];

/** All Set's variant: the same colours with the light band raised so more map shows through. */
export const ALL_SET_BACKDROP_STOPS: readonly BackdropStop[] = [
  [0, 55, 135, 101, 0.61],
  [0.27962, 245, 247, 246, 0.01],
  [0.35832, 223, 234, 229, 0.44],
  [1, 55, 135, 101, 0.53],
];

/** The CSS background image for a backdrop stop list. */
export function gradient(stops: readonly BackdropStop[]) {
  return `linear-gradient(180deg, ${stops
    .map(([at, r, g, b, a]) => `rgba(${r}, ${g}, ${b}, ${a}) ${at * 100}%`)
    .join(', ')})`;
}

const SURFACE = [1, 3, 5].map((i) => parseInt(Brand.surface.slice(i, i + 2), 16));

/**
 * The solid colour a backdrop shows at `fraction` (0 = top, 1 = bottom of the screen),
 * blended against `Brand.surface`. Lets overlays such as scroll fades blend into the
 * backdrop behind them.
 */
export function colorAt(fraction: number, stops: readonly BackdropStop[] = BACKDROP_STOPS) {
  const f = Math.min(1, Math.max(0, fraction));
  const i = stops.findIndex(([at]) => at >= f);
  const end = stops[Math.max(1, i)];
  const start = stops[Math.max(0, i - 1)];
  const t = end[0] === start[0] ? 0 : (f - start[0]) / (end[0] - start[0]);
  const lerp = (k: 1 | 2 | 3 | 4) => start[k] + (end[k] - start[k]) * t;
  const alpha = lerp(4);
  const [r, g, b] = ([1, 2, 3] as const).map((k, j) =>
    Math.round(lerp(k) * alpha + SURFACE[j] * (1 - alpha)),
  );
  return { r, g, b };
}
