import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Brand, TextStyles, type BrandColor, type TextRole } from '@/constants/theme';

export type TextProps = RNTextProps & {
  /** The role that owns the size, line height, weight and default colour. */
  variant: TextRole;
  /**
   * Replaces the role's colour with another `Brand` colour. Only for components that pick a
   * colour by state, such as the selected date-wheel item or the signed-in leaderboard row.
   */
  color?: BrandColor;
};

/** The app's only text component: every string renders through a named role. */
export function Text({ variant, color, style, ...rest }: TextProps) {
  return (
    <RNText
      style={[TextStyles[variant], color !== undefined && { color: Brand[color] }, style]}
      {...rest}
    />
  );
}
