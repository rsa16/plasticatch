import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { toneColor, type TextTone, type TextVariant } from '@/components/ui/type';
import { useTheme } from '@/theme';

export type TextProps = RNTextProps & {
  /** The role that owns the size, line height, weight and face. */
  variant?: TextVariant;
  /** Semantic colour. Screens never pass a raw colour. */
  tone?: TextTone;
};

/** The app's only text component: every string renders through a named role and tone. */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  const theme = useTheme();

  return (
    <RNText style={[theme.type[variant], { color: toneColor(tone, theme) }, style]} {...rest} />
  );
}
