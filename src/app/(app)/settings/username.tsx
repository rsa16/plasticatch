import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { Text } from '@/components/text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSessionStore } from '@/features/auth';
import {
  checkUsernameAvailable,
  claimUsername,
  usernameErrorMessage,
} from '@/features/onboarding/profile-service';
import { usernameToSave, useUsernameCooldown } from '@/features/profile';
import { useTheme } from '@/theme';

/** How long the field must sit still before asking the server about availability. */
const AVAILABILITY_DEBOUNCE_MS = 400;

type Availability =
  | { state: 'idle' | 'checking' | 'available' | 'error' }
  | { state: 'unavailable'; code: string | null };

/** The last answer, tagged with the candidate it describes so a stale answer is ignored. */
type CheckedAvailability = { candidate: string; availability: Availability };

/** Edit the public username through the server's policy, uniqueness and cooldown. */
export default function UsernameScreen() {
  const theme = useTheme();
  const profile = useSessionStore((state) => state.profile);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  const barHeight = useBottomBarHeight();
  const storedUsername = profile?.username ?? null;
  const cooldown = useUsernameCooldown(profile?.usernameChangedAt ?? null);

  const [username, setUsername] = useState(storedUsername ?? '');
  const [checked, setChecked] = useState<CheckedAvailability | null>(null);
  const [pending, setPending] = useState(false);

  // The profile may resolve after this route mounts; keep the field in step with the server.
  const [syncedUsername, setSyncedUsername] = useState(storedUsername);
  if (storedUsername !== syncedUsername) {
    setSyncedUsername(storedUsername);
    setUsername(storedUsername ?? '');
  }

  const candidate = usernameToSave(username, storedUsername);
  // Derive the visible answer from the current candidate, so an answer about an older value can
  // never be shown while the field itself has moved on.
  const availability: Availability =
    !cooldown.active && checked?.candidate === candidate ? checked.availability : { state: 'idle' };

  // Ask the server as the player types, but only once the name differs and the cooldown is over.
  // A blank or unchanged field needs no request.
  useEffect(() => {
    if (!candidate || cooldown.active) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      setChecked({ candidate, availability: { state: 'checking' } });

      checkUsernameAvailable(candidate)
        .then((check) => {
          if (cancelled) return;
          setChecked({
            candidate,
            availability: check.available
              ? { state: 'available' }
              : { state: 'unavailable', code: check.code },
          });
        })
        .catch(() => {
          if (!cancelled) setChecked({ candidate, availability: { state: 'error' } });
        });
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidate, cooldown.active]);

  const canSave =
    Boolean(candidate) && !cooldown.active && availability.state === 'available' && !pending;

  async function save() {
    if (!candidate || !canSave) return;

    setPending(true);

    try {
      const result = await claimUsername(candidate);

      if (!result.success) {
        if (result.code === 'username_cooldown') await refreshProfile();
        Alert.alert(
          'Could not change username',
          usernameErrorMessage(result.code) ?? 'Check the username and try again.',
        );
        return;
      }

      await refreshProfile();
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not change username',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen title="Username" actions={<BackButton />}>
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="body" tone="muted">
            Your username is public and unique.
          </Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            onSubmitEditing={save}
            editable={!pending && !cooldown.active}
            style={[
              theme.type.body,
              styles.input,
              {
                color: theme.color.ink,
                backgroundColor: theme.color.surfaceSunken,
                borderColor: theme.color.line,
              },
            ]}
            placeholderTextColor={theme.color.inkMuted}
            accessibilityLabel="Username"
            autoComplete="username"
            textContentType="username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />

          <AvailabilityNote availability={availability} candidate={candidate !== null} />

          {cooldown.label && (
            <Card sunken>
              <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
                {cooldown.label}
              </Text>
            </Card>
          )}

          <Button
            label={pending ? 'Saving…' : 'Save username'}
            size="lg"
            onPress={save}
            disabled={!canSave}
          />
          <Button label="Back to Settings" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </View>
    </Screen>
  );
}

function AvailabilityNote({
  availability,
  candidate,
}: {
  availability: Availability;
  candidate: boolean;
}) {
  if (!candidate) return null;
  if (availability.state === 'idle') return null;

  if (availability.state === 'checking') {
    return (
      <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
        Checking availability…
      </Text>
    );
  }

  if (availability.state === 'available') {
    return (
      <Text variant="caption" tone="accent" accessibilityLiveRegion="polite">
        That username is available.
      </Text>
    );
  }

  if (availability.state === 'error') {
    return (
      <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
        Could not check availability. Check your connection and try again.
      </Text>
    );
  }

  if (availability.state !== 'unavailable') return null;

  return (
    <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
      {usernameErrorMessage(availability.code) ?? 'That username is not available.'}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
