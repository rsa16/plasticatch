import {
  ALL_SET_BACKDROP_STOPS,
  BACKDROP_STOPS,
  colorAt,
  gradient,
  type BackdropStop,
} from '@/components/backdrop';

/**
 * These are the stop lists the screens used before the backdrop module existed (transcribed
 * from `onboarding.tsx` and `all-set.tsx` at `bb27726`). The backdrop is visually sensitive, so
 * changing a stop is a design change, not a refactor.
 */
const STANDARD_STOPS: readonly BackdropStop[] = [
  [0, 55, 135, 101, 0.61],
  [0.3, 245, 247, 246, 0.01],
  [0.6, 223, 234, 229, 0.44],
  [1, 55, 135, 101, 0.53],
];

const RAISED_BAND_STOPS: readonly BackdropStop[] = [
  [0, 55, 135, 101, 0.61],
  [0.27962, 245, 247, 246, 0.01],
  [0.35832, 223, 234, 229, 0.44],
  [1, 55, 135, 101, 0.53],
];

describe('backdrop stops', () => {
  it('keeps the standard stop list', () => {
    expect(BACKDROP_STOPS).toEqual(STANDARD_STOPS);
  });

  it('keeps All Set’s raised light band', () => {
    expect(ALL_SET_BACKDROP_STOPS).toEqual(RAISED_BAND_STOPS);
  });
});

describe('colorAt', () => {
  it('blends the first stop over the surface at the top', () => {
    expect(colorAt(0, BACKDROP_STOPS)).toEqual({ r: 130, g: 179, b: 158 });
  });

  it('blends the last stop over the surface at the bottom', () => {
    expect(colorAt(1, BACKDROP_STOPS)).toEqual({ r: 145, g: 188, b: 170 });
  });

  it('interpolates between the surrounding stops at the midpoint', () => {
    expect(colorAt(0.5, BACKDROP_STOPS)).toEqual({ r: 242, g: 245, b: 243 });
  });

  it('clamps fractions below 0 to the top colour', () => {
    expect(colorAt(-0.25, BACKDROP_STOPS)).toEqual(colorAt(0, BACKDROP_STOPS));
  });

  it('clamps fractions above 1 to the bottom colour', () => {
    expect(colorAt(1.25, BACKDROP_STOPS)).toEqual(colorAt(1, BACKDROP_STOPS));
  });
});

describe('gradient', () => {
  it('renders every stop as a top-to-bottom CSS gradient', () => {
    expect(gradient(STANDARD_STOPS)).toBe(
      'linear-gradient(180deg, rgba(55, 135, 101, 0.61) 0%, rgba(245, 247, 246, 0.01) 30%, rgba(223, 234, 229, 0.44) 60%, rgba(55, 135, 101, 0.53) 100%)',
    );
  });
});
