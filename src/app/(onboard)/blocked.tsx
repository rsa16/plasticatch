import { router } from 'expo-router';
import { View } from 'react-native';

import { ONBOARDING_STEPS, OnboardingHeading, OnboardingPrompt } from '@/components/onboarding';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { MIN_AGE } from '@/features/onboarding/age';
import { makeStyles } from '@/theme';

/**
 * The age gate's dead end: the player cannot continue onboarding, and the only action is to go
 * back and correct the date of birth so the gate can re-evaluate it.
 */
export default function BlockedScreen() {
  const styles = useStyles();

  return (
    <Screen header={<OnboardingProgress step={1} total={ONBOARDING_STEPS} />}>
      <View style={styles.body}>
        <OnboardingHeading>Age Requirement</OnboardingHeading>
        <OnboardingPrompt>
          {`You must be at least ${MIN_AGE} years old to play PlastiCatch. Go back to change your date of birth.`}
        </OnboardingPrompt>
        <Text variant="caption" tone="muted">
          Nothing is saved while you are on this screen.
        </Text>

        <Button
          label="Change date of birth"
          // Return to the wheel already on the stack; a deep-linked dead end replaces itself.
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/date-of-birth'))}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  body: {
    flex: 1,
    gap: t.space.lg,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: t.space.xl,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: t.space.sm,
  },
}));
