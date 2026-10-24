import { Platform } from 'react-native';

/** PlastiCatch brand palette. These screens use a fixed dark-green look in both color schemes. */
export const Brand = {
  green: '#193328',
  greenDeep: '#09140f',
  surface: '#f7f8f7',
  onSurface: '#1b1f1c',
  accent: '#378765',
  accentMuted: '#a2dfc5',
  field: '#d9e0d9',
  catchTab: '#39936d',
  icon: '#000000',
  rowText: '#4f4f4f',
  rowTextStrong: '#303030',
  danger: '#873737',
} as const;

/** A key into `Brand`; components may pass one to a text role that picks a colour by state. */
export type BrandColor = keyof typeof Brand;

/**
 * The app's text roles. A role owns both its type treatment and its colour, so screens and
 * components never declare a raw font size, line height, weight, or text colour.
 *
 * The first six are the product roles. `menuTitle`, `prompt` and `wheelItem` are additions the
 * human approved on 2026-10-24 to keep the parity screens pixel-identical; each is used by at
 * least two screens (menu title: the four menu screens; prompt: the onboarding steps; wheel
 * item: Date of Birth and Settings). Do not add another one-off role without the same rule.
 */
export const TextStyles = {
  heading: { color: Brand.onSurface, fontSize: 40, lineHeight: 44, fontWeight: 700 },
  sectionTitle: { color: Brand.onSurface, fontSize: 30, lineHeight: 38, fontWeight: 700 },
  fieldText: { color: Brand.onSurface, fontSize: 25, lineHeight: 30, fontWeight: 400 },
  buttonLabel: { color: Brand.surface, fontSize: 25, lineHeight: 30, fontWeight: 400 },
  // Leaderboard rows: the app's densest body copy.
  body: { color: Brand.rowText, fontSize: 14.4, lineHeight: 21.6, fontWeight: 400 },
  // Bottom-menu labels and other small supporting text.
  caption: { color: Brand.onSurface, fontSize: 15, lineHeight: 18, fontWeight: 400 },
  menuTitle: { color: Brand.surface, fontSize: 40, lineHeight: 47, fontWeight: 400 },
  prompt: { color: Brand.accent, fontSize: 25, lineHeight: 30, fontWeight: 400 },
  wheelItem: { color: Brand.onSurface, fontSize: 22, lineHeight: 28, fontWeight: 400 },
} as const;

export type TextRole = keyof typeof TextStyles;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
