import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ONBOARDING_STEPS, OnboardingHeading, OnboardingPrompt } from '@/components/onboarding';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';
import { MIN_AGE } from '@/features/onboarding/age';

/**
 * The age gate's dead end: the player cannot continue onboarding, and the only action is to go
 * back and correct the date of birth so the gate can re-evaluate it.
 */
export default function BlockedScreen() {
  return (
    <ScreenFrame
      top="step"
      header={<OnboardingProgress step={1} total={ONBOARDING_STEPS} />}
      contentStyle={styles.frame}
    >
      <View style={styles.body}>
        <OnboardingHeading>Age Requirement</OnboardingHeading>
        <OnboardingPrompt>
          {`You must be at least ${MIN_AGE} years old to play PlastiCatch. Go back to change your date of birth.`}
        </OnboardingPrompt>

        <Pressable
          accessibilityRole="button"
          // Replace the dead end so Back from the date wheel cannot return here.
          onPress={() => router.replace('/date-of-birth')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text variant="buttonLabel">Change date of birth</Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    paddingHorizontal: 28,
  },
  body: {
    flex: 1,
    maxWidth: 350,
    paddingTop: 61,
    paddingBottom: Spacing.four,
    gap: 20,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
