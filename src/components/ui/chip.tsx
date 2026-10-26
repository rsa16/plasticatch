import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { makeStyles, useTheme } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'switch' | 'tab';
};

/** A compact state or filter control: pill, hairline, accent tint when selected. */
export function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  icon,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
}: ChipProps) {
  const styles = useStyles();
  const content = (
    <>
      {icon}
      <Text variant="caption" tone={selected ? 'accent' : 'default'}>
        {label}
      </Text>
    </>
  );
  const shared = [styles.chip, selected && styles.chipSelected, style] as const;

  if (!onPress) {
    return <View style={shared}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={
        accessibilityRole === 'switch' ? { checked: selected, disabled } : { selected, disabled }
      }
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ...shared,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

type BadgeTone = 'neutral' | 'accent' | 'lime' | 'gold' | 'danger' | 'brand';

/** A small status pill: level, ON/OFF, streak, "you". */
export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useStyles();

  const palette = {
    neutral: { backgroundColor: theme.color.surfaceSunken, color: theme.color.inkMuted },
    accent: { backgroundColor: theme.color.accentTint, color: theme.color.accent },
    lime: { backgroundColor: theme.color.lime, color: theme.color.brand },
    gold: { backgroundColor: theme.color.gold, color: theme.color.brand },
    danger: { backgroundColor: theme.color.danger, color: theme.color.onDanger },
    brand: { backgroundColor: theme.color.brand, color: theme.color.onBrand },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }, style]}>
      <Text variant="caption" style={{ color: palette.color }}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
    minHeight: 36,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.xs,
    borderRadius: t.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.line,
    backgroundColor: t.color.surface,
  },
  chipSelected: {
    backgroundColor: t.color.accentTint,
    borderColor: t.color.accent,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: t.space.sm,
    paddingVertical: 2,
    borderRadius: t.radius.pill,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
}));
