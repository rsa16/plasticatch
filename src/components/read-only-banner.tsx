import { router } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';

/** The minimum comfortable touch target for the banner's Settings action. */
const ACTION_MIN_SIZE = 44;

type ReadOnlyBannerProps = {
  /** Which permissions are missing, in plain language. */
  reason: string;
};

/**
 * The persistent read-only banner. It floats just above the tab bar so it survives every tab
 * switch, repeats the reason, and deep-links to the place where the permissions can be changed.
 */
export function ReadOnlyBanner({ reason }: ReadOnlyBannerProps) {
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
        <Text variant="caption" style={styles.title}>
          You&apos;re in read-only mode
        </Text>
        <Text variant="caption" style={styles.reason}>
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
        <Text variant="caption" style={styles.actionLabel}>
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    // The tab bar is the positioning parent; `100%` is its top edge.
    bottom: '100%',
    marginBottom: Spacing.two,
    minHeight: ACTION_MIN_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.two,
    paddingRight: Spacing.two,
    borderRadius: 15,
    backgroundColor: Brand.surface,
    boxShadow: '0px 2px 6px 0px rgba(0, 0, 0, 0.25)',
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontWeight: '700',
  },
  reason: {
    color: Brand.rowText,
  },
  action: {
    minWidth: ACTION_MIN_SIZE,
    minHeight: ACTION_MIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  actionLabel: {
    color: Brand.surface,
  },
  pressed: {
    opacity: 0.7,
  },
});
