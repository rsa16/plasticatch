import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

type CardProps = {
  children: ReactNode;
  sunken?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: 'summary' | 'progressbar';
  accessibilityLabel?: string;
};

/** The app's raised content surface: hairline border, no decorative shadow. */
export function Card({
  children,
  sunken = false,
  padded = true,
  style,
  accessibilityRole,
  accessibilityLabel,
}: CardProps) {
  const styles = useStyles();

  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, sunken ? styles.sunken : styles.surface, padded && styles.padded, style]}
    >
      {children}
    </View>
  );
}

/** A hairline separator in the theme's line colour. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.color.line }, style]}
    />
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: t.radius.lg,
  },
  surface: {
    backgroundColor: t.color.surface,
    borderColor: t.color.line,
  },
  sunken: {
    backgroundColor: t.color.surfaceSunken,
    borderColor: 'transparent',
  },
  padded: {
    padding: t.space.lg,
  },
}));
