import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  OnboardingField,
  OnboardingHeading,
  OnboardingPrompt,
  OnboardingScreen,
} from '@/components/onboarding';
import { useSessionStore } from '@/features/auth';
import { goBackOr } from '@/features/onboarding/back';
import { useOnboardingDraftStore, usernameProblem } from '@/features/onboarding/draft';
import {
  checkUsernameAvailable,
  claimUsername,
  usernameErrorMessage,
} from '@/features/onboarding/profile-service';

export default function ProfileScreen() {
  const { username, setUsername } = useOnboardingDraftStore();
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  const [pending, setPending] = useState(false);

  // The server owns username policy, availability and the 14-day cooldown. This step asks it,
  // then claims the name, and only moves on once the profile row actually holds it.
  async function handleNext() {
    if (pending || usernameProblem(username) !== null) return;

    // The server accepts only lowercase names, so normalise before asking.
    const candidate = username.trim().toLowerCase();
    setPending(true);

    try {
      const check = await checkUsernameAvailable(candidate);
      if (!check.available) {
        Alert.alert('Username unavailable', usernameErrorMessage(check.code) ?? 'Try another.');
        return;
      }

      const claimed = await claimUsername(candidate);
      if (!claimed.success) {
        Alert.alert(
          'Username unavailable',
          usernameErrorMessage(claimed.code) ?? 'Check the username and try again.',
        );
        return;
      }

      setUsername(candidate);
      await refreshProfile();
      router.push('/home-state');
    } catch (error) {
      Alert.alert(
        'Could not save username',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingScreen
      step={2}
      onBack={() => goBackOr('/date-of-birth')}
      onNext={handleNext}
      nextDisabled={pending || usernameProblem(username) !== null}
    >
      <OnboardingHeading>Username</OnboardingHeading>
      <OnboardingPrompt>Enter in the field below:</OnboardingPrompt>
      <OnboardingField
        value={username}
        onChangeText={setUsername}
        accessibilityLabel="Username"
        autoComplete="username-new"
        textContentType="username"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </OnboardingScreen>
  );
}
