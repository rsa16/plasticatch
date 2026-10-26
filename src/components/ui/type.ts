import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme, type Theme } from '@/theme';

/** The type roles. Every role owns its size, line height, weight and face. */
export type TextVariant =
  'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'numeric';

/** The semantic colour a text role takes. Never pass a raw colour. */
export type TextTone =
  'default' | 'muted' | 'accent' | 'inverse' | 'danger' | 'onAccent' | 'gold' | 'streak';

export function toneColor(tone: TextTone, theme: Theme): string {
  switch (tone) {
    case 'muted':
      return theme.color.inkMuted;
    case 'accent':
      return theme.color.accent;
    case 'inverse':
      return theme.color.onBrand;
    case 'danger':
      return theme.color.danger;
    case 'onAccent':
      return theme.color.onAccent;
    case 'gold':
      return theme.color.gold;
    case 'streak':
      return theme.color.streak;
    default:
      return theme.color.ink;
  }
}

/**
 * Applies a type role and tone to a style object. Exported so primitives (buttons, chips) can use
 * the same treatment on a raw `Text` without rendering through `<Text>`.
 */
export function textStyle(
  theme: Theme,
  variant: TextVariant,
  tone: TextTone = 'default',
): TextStyle {
  const style = StyleSheet.flatten([theme.type[variant], { color: toneColor(tone, theme) }]);
  return style as TextStyle;
}

/** Style helper for a surface that needs to sit on the theme's background. */
export function surfaceStyle(theme: Theme, variant: 'surface' | 'sunken' = 'surface'): ViewStyle {
  return {
    backgroundColor: variant === 'surface' ? theme.color.surface : theme.color.surfaceSunken,
    borderColor: theme.color.line,
    borderWidth: StyleSheet.hairlineWidth,
  };
}

/** Re-exported so primitives do not need a second import for the theme type. */
export type { Theme };
export { useTheme };
