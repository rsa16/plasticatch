import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';
import { useCatchStore } from '@/features/catch';
import { FALLBACK_REJECTION } from '@/features/verification/rejection';

/**
 * A rejected catch. The server's code maps to one plain-language reason and one retry half; the
 * retry preserves the Find photo when only the Dispose half needs replacing.
 */
export default function CatchRejectScreen() {
  const rejection = useCatchStore((state) => state.rejection) ?? FALLBACK_REJECTION;
  const retry = useCatchStore((state) => state.retry);
  const reset = useCatchStore((state) => state.reset);

  function tryAgain() {
    retry(rejection.retry);
    router.replace(rejection.retry === 'find' ? '/catch/find' : '/catch/dispose');
  }

  return (
    <ScreenFrame top="step">
      <View style={styles.body}>
        <Text variant="pageTitle" style={styles.title} accessibilityRole="header">
          Catch not verified
        </Text>
        <Text variant="fieldText" style={styles.message} accessibilityRole="alert">
          {rejection.message}
        </Text>
        <Text variant="fieldText" style={styles.noXp}>
          No XP was awarded and nothing was added to My Catches.
        </Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={tryAgain}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text variant="buttonLabel">TRY AGAIN</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              reset();
              router.dismissTo('/map');
            }}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text variant="buttonLabel">CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 330,
  },
  noXp: {
    textAlign: 'center',
    maxWidth: 330,
  },
  actions: {
    marginTop: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  primary: {
    minWidth: 220,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  secondary: {
    minWidth: 220,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
