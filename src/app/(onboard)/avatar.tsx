import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { AvatarPicker } from '@/components/avatar-picker';
import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';
import { Button } from '@/components/ui/button';
import { AVATAR_PARTS, avatarPresets, type AvatarSelection } from '@/constants/avatar';
import { useSessionStore } from '@/features/auth';
import { avatarErrorMessage, avatarSelectionFrom, saveAvatar } from '@/features/avatar';
import { goBackOr } from '@/features/onboarding/back';
import { useTheme } from '@/theme';

/**
 * Build the head that marks the player on the map and the leaderboard.
 *
 * The step starts on whatever the profile already holds, so returning to it (or finishing
 * onboarding later) never resets a choice. Next persists through the same RPC Settings uses and
 * only advances once the profile actually carries the avatar.
 */
export default function AvatarScreen() {
  const theme = useTheme();
  const profile = useSessionStore((state) => state.profile);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);

  const [selection, setSelection] = useState<AvatarSelection>(() =>
    avatarSelectionFrom(profile?.avatar ?? null),
  );
  const [pending, setPending] = useState(false);

  /** A new look on every press, so the step is playable rather than a form. */
  function shuffle() {
    const next = { ...selection };
    for (const part of AVATAR_PARTS) {
      const presets = avatarPresets(part);
      next[part] = presets[Math.floor(Math.random() * presets.length)]?.id ?? next[part];
    }
    setSelection(next);
  }

  async function handleNext() {
    if (pending) return;
    setPending(true);

    try {
      const result = await saveAvatar(selection);

      if (!result.success) {
        Alert.alert(
          'Could not save your avatar',
          avatarErrorMessage(result.code) ?? 'Pick a different combination and try again.',
        );
        return;
      }

      await refreshProfile();
      router.push('/home-state');
    } catch (error) {
      Alert.alert(
        'Could not save your avatar',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingScreen
      step={3}
      scroll
      onBack={() => goBackOr('/profile')}
      onNext={handleNext}
      nextDisabled={pending}
      nextLabel={pending ? 'Saving…' : 'Next'}
    >
      <OnboardingHeading>Build your catcher</OnboardingHeading>
      <OnboardingPrompt>
        Pick a look. This head is you on the map and the leaderboard.
      </OnboardingPrompt>

      <AvatarPicker selection={selection} onChange={setSelection} />

      <Button
        label="Shuffle"
        variant="secondary"
        icon={
          <SymbolView
            name={{ ios: 'dice.fill', android: 'casino', web: 'casino' }}
            tintColor={theme.color.accent}
            size={18}
          />
        }
        onPress={shuffle}
        style={styles.shuffle}
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  shuffle: {
    alignSelf: 'center',
  },
});
