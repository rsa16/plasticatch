import { router } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { makeStyles } from '@/theme';

type ReadOnlyBannerProps = {
  /** Which permissions are missing, in plain language. */
  reason: string;
};

/**
 * The persistent read-only banner. It floats just above the tab bar so it survives every tab
 * switch, repeats the reason, and deep-links to the place where the permissions can be changed.
 */
export function ReadOnlyBanner({ reason }: ReadOnlyBannerProps) {
  const styles = useStyles();

  function openSettings() {
    // Only the OS settings app can change an already-denied permission on mobile. The browser
    // has no equivalent, so web falls back to the app's own Settings screen.
    if (Platform.OS === 'web') {
      router.push('/settings');
    } else {
      void Linking.openSettings();
    }
  }

  return (
    <View style={styles.banner} testID="read-only-banner">
      <View style={styles.copy}>
        <Text variant="label">Read-only mode</Text>
        <Text variant="caption" tone="muted">
          {reason}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Settings"
        accessibilityHint="Opens the device settings where camera and location access can be changed"
        onPress={openSettings}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text variant="caption" tone="accent">
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    position: 'absolute',
    left: t.space.md,
    right: t.space.md,
    // The tab bar is the positioning parent; `100%` is its top edge.
    bottom: '100%',
    marginBottom: t.space.sm,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingLeft: t.space.lg,
    paddingVertical: t.space.sm,
    paddingRight: t.space.sm,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.line,
    backgroundColor: t.color.surface,
    ...t.elevation.floating,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.sm,
  },
  pressed: {
    opacity: 0.7,
  },
}));
