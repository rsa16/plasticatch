import { Brand, TextStyles } from '@/constants/theme';

/**
 * The agreed role set: the six product roles plus the three additions the human approved on
 * 2026-10-24 to keep the parity screens pixel-identical. Changing this list is a product
 * decision, so the test asserts it explicitly.
 */
const ROLES = [
  'heading',
  'sectionTitle',
  'fieldText',
  'buttonLabel',
  'body',
  'caption',
  'menuTitle',
  'prompt',
  'wheelItem',
] as const;

/**
 * Metrics the pre-migration screens used, transcribed from the component styles before the
 * theme change. These are the values the screenshot comparison depends on.
 */
const SCREEN_METRICS = {
  heading: [40, 44, 700, Brand.onSurface],
  sectionTitle: [30, 38, 700, Brand.onSurface],
  fieldText: [25, 30, 400, Brand.onSurface],
  buttonLabel: [25, 30, 400, Brand.surface],
  body: [14.4, 21.6, 400, Brand.rowText],
  caption: [15, 18, 400, Brand.onSurface],
  menuTitle: [40, 47, 400, Brand.surface],
  prompt: [25, 30, 400, Brand.accent],
  wheelItem: [22, 28, 400, Brand.onSurface],
} as const;

describe('text roles', () => {
  it('exposes exactly the agreed role set', () => {
    expect(Object.keys(TextStyles).sort()).toEqual([...ROLES].sort());
  });

  it('gives every role a type size, line height, weight and brand colour', () => {
    for (const role of ROLES) {
      const style = TextStyles[role];
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
      expect(style.fontWeight).toBeGreaterThanOrEqual(400);
      expect(Object.values(Brand)).toContain(style.color);
    }
  });

  it('keeps the metrics the parity screens were designed with', () => {
    for (const role of ROLES) {
      const [fontSize, lineHeight, fontWeight, color] = SCREEN_METRICS[role];
      expect({
        fontSize: TextStyles[role].fontSize,
        lineHeight: TextStyles[role].lineHeight,
        fontWeight: TextStyles[role].fontWeight,
        color: TextStyles[role].color,
      }).toEqual({ fontSize, lineHeight, fontWeight, color });
    }
  });
});
