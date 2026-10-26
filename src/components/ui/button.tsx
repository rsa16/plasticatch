import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { makeStyles, useTheme, type Theme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** A leading icon, usually a SymbolView. */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** The app's action button. Every screen uses it instead of styling a Pressable. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const palette = buttonPalette(theme, variant);
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.large : styles.medium,
        palette.container,
        pressed && !inactive && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          {icon}
          <Text variant="label" style={{ color: palette.text }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function buttonPalette(theme: Theme, variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.color.line,
        },
        text: theme.color.ink,
      };
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent' },
        text: theme.color.accent,
      };
    case 'danger':
      return {
        container: { backgroundColor: theme.color.danger },
        text: theme.color.onDanger,
      };
    default:
      return {
        container: { backgroundColor: theme.color.accent },
        text: theme.color.onAccent,
      };
  }
}

const useStyles = makeStyles((t) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.sm,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.xl,
  },
  medium: {
    minHeight: 48,
    paddingVertical: t.space.md,
  },
  large: {
    minHeight: 56,
    paddingVertical: t.space.lg,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
  },
}));

/** A compact icon-only action with a guaranteed 44 pt target. */
export function IconButton({
  onPress,
  children,
  label,
  hint,
  surface = false,
  style,
}: {
  onPress?: () => void;
  children: ReactNode;
  label: string;
  hint?: string;
  surface?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const palette = surface
    ? { backgroundColor: theme.color.surface, borderWidth: StyleSheet.hairlineWidth }
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, palette, style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}
