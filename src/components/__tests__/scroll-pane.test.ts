import { fadeGradient, thumbOffset } from '@/components/scroll-pane';

// The pane is a Reanimated component; the pure thumb maths needs none of its runtime.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {},
  useAnimatedScrollHandler: () => () => undefined,
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: number) => ({ value }),
}));

const PANE = { contentHeight: 1200, viewportHeight: 600, thumbHeight: 57 } as const;

describe('thumbOffset', () => {
  it('sits at the top when the content fits', () => {
    expect(
      thumbOffset({ scrollY: 0, contentHeight: 400, viewportHeight: 600, thumbHeight: 57 }),
    ).toBe(0);
    expect(
      thumbOffset({ scrollY: 120, contentHeight: 400, viewportHeight: 600, thumbHeight: 57 }),
    ).toBe(0);
  });

  it('moves in proportion to how far the content is scrolled', () => {
    // Halfway down 1200pt of content in a 600pt viewport, inside a 543pt track.
    expect(thumbOffset({ scrollY: 300, ...PANE })).toBe(271.5);
    expect(thumbOffset({ scrollY: 150, ...PANE })).toBe(135.75);
  });

  it('clamps to the ends of the track', () => {
    // iOS rubber-bands past both ends; the thumb must not leave the track.
    expect(thumbOffset({ scrollY: -40, ...PANE })).toBe(0);
    expect(thumbOffset({ scrollY: 900, ...PANE })).toBe(543);
    expect(thumbOffset({ scrollY: 600, ...PANE })).toBe(543);
    expect(thumbOffset({ scrollY: 0, ...PANE })).toBe(0);
  });
});

describe('fadeGradient', () => {
  it('fades the backdrop colour at that window fraction into the pane', () => {
    // colorAt(0) is the backdrop's top colour (pinned in backdrop.test.ts).
    expect(fadeGradient(0, false)).toBe(
      'linear-gradient(to bottom, rgba(130, 179, 158, 1), rgba(130, 179, 158, 0))',
    );
    expect(fadeGradient(0, true)).toBe(
      'linear-gradient(to bottom, rgba(130, 179, 158, 0), rgba(130, 179, 158, 1))',
    );
  });
});
