import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { makeStyles, useTheme } from '@/theme';

type MeterTone = 'accent' | 'lime' | 'gold';

type MeterProps = {
  value: number;
  max?: number;
  label?: string;
  /** Right-aligned value copy, e.g. "240 / 500 XP". */
  valueLabel?: string;
  tone?: MeterTone;
  style?: StyleProp<ViewStyle>;
};

/** A slim progress meter for XP, level and rank. Never the only way to read the value. */
export function Meter({ value, max = 1, label, valueLabel, tone = 'accent', style }: MeterProps) {
  const theme = useTheme();
  const styles = useStyles();
  const clamped = Math.max(0, Math.min(max, value));
  const percent = max === 0 ? 0 : Math.round((clamped / max) * 100);
  const fill = {
    accent: theme.color.accent,
    lime: theme.color.lime,
    gold: theme.color.gold,
  }[tone];

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      {(label || valueLabel) && (
        <View style={styles.labels}>
          {label && <Text variant="caption">{label}</Text>}
          {valueLabel && (
            <Text variant="caption" tone="muted">
              {valueLabel}
            </Text>
          )}
        </View>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.space.xs,
  },
  labels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    height: 8,
    overflow: 'hidden',
    borderRadius: t.radius.pill,
    backgroundColor: t.color.surfaceSunken,
  },
  fill: {
    height: '100%',
    borderRadius: t.radius.pill,
  },
}));

/** A vertical rule used inside compact stat groups. */
export function StatLine({
  label,
  value,
  valueTone = 'default',
}: {
  label: string;
  value: string;
  valueTone?: 'default' | 'muted' | 'accent' | 'gold';
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStatStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="label" tone={valueTone}>
        {value}
      </Text>
    </View>
  );
}

const makeStatStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.space.md,
    },
  });
