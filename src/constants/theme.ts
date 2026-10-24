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
 * The first six are the product roles. The others were approved by the human on 2026-10-24 to
 * keep every brand screen visually identical to the pre-migration design: `menuTitle` (four
 * menu screens), `prompt` (three onboarding steps) and `wheelItem` (Date of Birth, Settings and
 * Permissions) serve more than one screen; `displayTitle`, `displayTagline`, `secondaryButtonLabel`
 * (Sign-in), `legalText`, `legalConsent` (Terms), `statusText`, `compactButtonLabel`
 * (Permissions) and `pageTitle` (All set) each restore a single screen's original style after
 * the two-screen rule was relaxed for this fix. Do not add another role without the same
 * evidence: a screenshot comparison proving it is needed.
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
  // Sign-in: the brand hero, its tagline, and the labels on the light provider buttons.
  displayTitle: { color: Brand.surface, fontSize: 65, lineHeight: 68, fontWeight: 700 },
  displayTagline: { color: Brand.surface, fontSize: 35, lineHeight: 41, fontWeight: 400 },
  secondaryButtonLabel: { color: Brand.onSurface, fontSize: 20, lineHeight: 24, fontWeight: 400 },
  // Terms: long-form legal copy and the line beside the agreement checkbox.
  legalText: { color: Brand.accent, fontSize: 20, lineHeight: 26, fontWeight: 400 },
  legalConsent: { color: Brand.accent, fontSize: 20, lineHeight: 24, fontWeight: 400 },
  // Permissions: the status line under a row label and the compact Allow action.
  statusText: { color: Brand.onSurface, fontSize: 16, lineHeight: 20, fontWeight: 400 },
  compactButtonLabel: { color: Brand.surface, fontSize: 18, lineHeight: 22, fontWeight: 400 },
  // All set: a standalone page title, not the menu-title pill.
  pageTitle: { color: Brand.onSurface, fontSize: 40, lineHeight: 47, fontWeight: 700 },
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
