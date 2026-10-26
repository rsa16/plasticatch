import { darkTheme, DisplayFont, lightTheme, themes, type Theme } from '@/theme/tokens';

/** WCAG 2.1 relative luminance and contrast ratio. */
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** Every text/background pair the app actually renders, at body-size thresholds. */
const PAIRS: [keyof Theme['color'], keyof Theme['color']][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'surfaceSunken'],
  ['inkMuted', 'bg'],
  ['inkMuted', 'surface'],
  ['inkMuted', 'surfaceSunken'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'accentTint'],
  ['onAccent', 'accent'],
  ['onBrand', 'brand'],
  ['onDanger', 'danger'],
  ['danger', 'surface'],
  ['danger', 'bg'],
];

describe.each([
  ['light', lightTheme],
  ['dark', darkTheme],
] as const)('%s theme', (name, theme) => {
  it('meets WCAG AA for every rendered text pair', () => {
    for (const [foreground, background] of PAIRS) {
      const ratio = contrast(theme.color[foreground], theme.color[background]);
      expect({ foreground, background, ratio: Number(ratio.toFixed(2)) }).toMatchObject({
        foreground,
        background,
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('defines every type role with a face, size and line height', () => {
    for (const role of Object.keys(theme.type) as (keyof Theme['type'])[]) {
      expect(theme.type[role].fontSize).toBeGreaterThan(0);
      expect(theme.type[role].lineHeight).toBeGreaterThanOrEqual(theme.type[role].fontSize!);
    }
  });

  it('keeps the display face on display roles only', () => {
    for (const role of ['display', 'title', 'heading', 'label', 'numeric'] as const) {
      expect(Object.values(DisplayFont)).toContain(theme.type[role].fontFamily);
    }
    expect(theme.type.body.fontFamily).toBeUndefined();
    expect(theme.type.caption.fontFamily).toBeUndefined();
  });
});

describe('theme set', () => {
  it('exposes exactly one light and one dark theme', () => {
    expect(themes.light.scheme).toBe('light');
    expect(themes.dark.scheme).toBe('dark');
  });

  it('uses tinted, non-pure backgrounds', () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect(theme.color.bg.toLowerCase()).not.toBe('#000000');
      expect(theme.color.bg.toLowerCase()).not.toBe('#ffffff');
      expect(theme.color.surface.toLowerCase()).not.toBe('#000000');
    }
  });
});
