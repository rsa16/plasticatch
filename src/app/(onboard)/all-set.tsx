import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ALL_SET_BACKDROP_STOPS } from '@/components/backdrop';
import { ONBOARDING_STEPS } from '@/components/onboarding';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { Brand } from '@/constants/theme';

export default function AllSetScreen() {
  return (
    <ScreenFrame
      top="step"
      stops={ALL_SET_BACKDROP_STOPS}
      backdropOverBackground
      contentStyle={styles.content}
      header={<OnboardingProgress step={ONBOARDING_STEPS} total={ONBOARDING_STEPS} />}
      background={
        <View style={styles.map} pointerEvents="none">
          <Image
            source={require('@/assets/images/all-set-map.png')}
            style={styles.mapImage}
            contentFit="fill"
          />
          <View style={styles.mapFade} />
        </View>
      }
    >
      <View style={styles.message}>
        <Text variant="pageTitle" style={styles.title}>
          You’re all set!
        </Text>
        <Image
          source={require('@/assets/images/all-set-divider.svg')}
          style={styles.divider}
          contentFit="fill"
        />
        <Pressable
          accessibilityRole="button"
          // Onboarding is finished, so drop it from history and land in the app shell.
          onPress={() => router.replace('/map')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text variant="buttonLabel">BEGIN CATCHING</Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
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
  content: {
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
});
