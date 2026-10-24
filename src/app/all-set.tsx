import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backdropGradient, ONBOARDING_STEPS, type BackdropStop } from '@/components/onboarding';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';

// This step's tint moves its light band higher than the other steps so the map shows through.
const BACKDROP_STOPS: readonly BackdropStop[] = [
  [0, 55, 135, 101, 0.61],
  [0.27962, 245, 247, 246, 0.01],
  [0.35832, 223, 234, 229, 0.44],
  [1, 55, 135, 101, 0.53],
];

export default function AllSetScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.map} pointerEvents="none">
        <Image
          source={require('@/assets/images/all-set-map.png')}
          style={styles.mapImage}
          contentFit="fill"
        />
        <View style={styles.mapFade} />
      </View>
      <View style={styles.backdrop} pointerEvents="none" />

      <View style={[styles.content, { paddingTop: insets.top + Spacing.two }]}>
        <OnboardingProgress step={ONBOARDING_STEPS} total={ONBOARDING_STEPS} />

        <View style={styles.message}>
          <ThemedText style={styles.title}>You’re all set!</ThemedText>
          <Image
            source={require('@/assets/images/all-set-divider.svg')}
            style={styles.divider}
            contentFit="fill"
          />
          <Pressable
            accessibilityRole="button"
            // Onboarding is finished, so drop it from history and land on the main app.
            onPress={() => router.replace('/ranking')}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <ThemedText style={styles.buttonLabel}>BEGIN CATCHING</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.surface,
  },
  // The map frame is 45pt wider than the screen on each side and pinned to the bottom.
  map: {
    position: 'absolute',
    left: -45,
    right: -45,
    bottom: 0,
    aspectRatio: 483 / 453,
    overflow: 'hidden',
  },
  mapImage: {
    position: 'absolute',
    left: '-79.53%',
    top: '-81.55%',
    width: '285.65%',
    height: '194.5%',
  },
  mapFade: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: `linear-gradient(to bottom, ${Brand.surface} 2.07%, rgba(247, 248, 247, 0) 92.28%)`,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: backdropGradient(BACKDROP_STOPS),
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  message: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 324,
    marginTop: 214,
    alignItems: 'center',
    gap: 20,
  },
  title: {
    color: Brand.onSurface,
    fontSize: 40,
    lineHeight: 47,
    fontWeight: 700,
    textAlign: 'center',
  },
  divider: {
    width: 324,
    height: 5,
    maxWidth: '100%',
    // Figma lays the 5px stroke out in a 1px slot; keep the surrounding spacing the same.
    marginVertical: -2,
    transform: [{ rotate: '-0.18deg' }],
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: Brand.surface,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: 400,
  },
});
