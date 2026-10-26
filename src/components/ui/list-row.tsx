import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Divider } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { TextTone } from '@/components/ui/type';
import { makeStyles, useTheme } from '@/theme';

type ListRowProps = {
  title: string;
  titleTone?: TextTone;
  subtitle?: string;
  /** Trailing value or action label. */
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Draws a hairline under the row. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** The dense row used by Settings, My Catches and leaderboard-adjacent lists. */
export function ListRow({
  title,
  titleTone = 'default',
  subtitle,
  value,
  leading,
  trailing,
  onPress,
  disabled = false,
  divider = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const theme = useTheme();
  const styles = useStyles();

  const body = (
    <>
      <View style={styles.row}>
        {leading}
        <View style={styles.text}>
          <Text variant="label" tone={titleTone}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          )}
        </View>
        {value && (
          <Text variant="caption" tone="accent">
            {value}
          </Text>
        )}
        {trailing}
      </View>
      {divider && <Divider />}
    </>
  );

  if (!onPress) {
    return (
      <View style={style} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          { backgroundColor: theme.color.surface },
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {body}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pressable: {
    marginHorizontal: -t.space.lg,
    paddingHorizontal: t.space.lg,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.sm,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
}));

/** A titled group of rows on a card surface. */
export function ListGroup({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeGroupStyles(theme), [theme]);

  return (
    <View style={[styles.group, style]}>
      {title && (
        <Text variant="heading" style={styles.title}>
          {title}
        </Text>
      )}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const makeGroupStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    group: {
      gap: t.space.sm,
    },
    title: {
      paddingHorizontal: t.space.xs,
    },
    body: {
      overflow: 'hidden',
      borderRadius: t.radius.lg,
      borderColor: t.color.line,
      backgroundColor: t.color.surface,
      paddingHorizontal: t.space.lg,
    },
  });
