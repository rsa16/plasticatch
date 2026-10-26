import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';

/**
 * A small icon with an optional count badge, used in the bottom menu. Kept framework-light so the
 * tab bar can render without importing a screen.
 */
export function MenuIcon({
  children,
  active,
  label,
  onPress,
}: {
  children: ReactNode;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={styles.icon}>{children}</View>
      <Text variant="caption" tone={active ? 'accent' : 'muted'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minWidth: 64,
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
