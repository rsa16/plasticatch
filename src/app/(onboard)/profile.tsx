import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  OnboardingField,
  OnboardingHeading,
  OnboardingPrompt,
  OnboardingScreen,
} from '@/components/onboarding';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth';
import { useOnboardingDraftStore, usernameProblem } from '@/features/onboarding/draft';
import {
  checkUsernameAvailable,
  claimUsername,
  usernameErrorMessage,
} from '@/features/onboarding/profile-service';

// One row of arrows per avatar part. What each row changes isn't defined yet.
const AVATAR_ROWS = [0, 1, 2];

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
      onBack={() => router.back()}
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

      <View style={styles.avatarSection}>
        <OnboardingHeading>Avatar</OnboardingHeading>
      </View>

      <View style={styles.avatarPicker}>
        <Image
          source={require('@/assets/images/avatar-placeholder.png')}
          style={styles.avatar}
          contentFit="cover"
          accessibilityLabel="Avatar preview"
        />
        {AVATAR_ROWS.map((row) => (
          <View key={row}>
            <Chevron direction="previous" row={row} />
            <Chevron direction="next" row={row} />
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

function Chevron({ direction, row }: { direction: 'previous' | 'next'; row: number }) {
  const isPrevious = direction === 'previous';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isPrevious ? 'Previous' : 'Next'} avatar option, row ${row + 1}`}
      hitSlop={Spacing.two}
      style={({ pressed }) => [
        styles.chevron,
        { top: row * CHEVRON_ROW_PITCH, left: isPrevious ? -3 : 269 },
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={require('@/assets/images/onboarding-chevron.svg')}
        style={[styles.chevronIcon, isPrevious && styles.mirrored]}
        contentFit="fill"
      />
    </Pressable>
  );
}

const CHEVRON_ROW_PITCH = 80;

const styles = StyleSheet.create({
  avatarSection: {
    marginTop: 43,
    gap: 20,
  },
  avatarPicker: {
    alignSelf: 'center',
    width: 291,
    height: 202,
    marginTop: 19,
  },
  avatar: {
    position: 'absolute',
    left: 44,
    width: 202,
    height: 202,
  },
  chevron: {
    position: 'absolute',
  },
  chevronIcon: {
    width: 25.0919,
    height: 44.1838,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  pressed: {
    opacity: 0.6,
  },
});
