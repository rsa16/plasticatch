import { Brand, TextStyles } from '@/constants/theme';

/**
 * The agreed role set. The six product roles came from the ticket; the rest are the additions
 * the human approved on 2026-10-24 to keep every brand screen pixel-identical (the "at least
 * two screens" rule was relaxed for the second round). Changing this list is a product
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
  'displayTitle',
  'displayTagline',
  'secondaryButtonLabel',
  'legalText',
  'legalConsent',
  'statusText',
  'compactButtonLabel',
  'pageTitle',
] as const;

/**
 * Metrics the pre-migration screens used, transcribed from the component styles at `f6d1fdb`.
 * These are the values the screenshot comparison depends on.
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
  displayTitle: [65, 68, 700, Brand.surface],
  displayTagline: [35, 41, 400, Brand.surface],
  secondaryButtonLabel: [20, 24, 400, Brand.onSurface],
  legalText: [20, 26, 400, Brand.accent],
  legalConsent: [20, 24, 400, Brand.accent],
  statusText: [16, 20, 400, Brand.onSurface],
  compactButtonLabel: [18, 22, 400, Brand.surface],
  pageTitle: [40, 47, 700, Brand.onSurface],
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

  it('keeps the metrics the pre-migration screens were designed with', () => {
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
