import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AvatarPicker } from '@/components/avatar-picker';
import { useBottomBarHeight } from '@/components/bottom-menu';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import type { AvatarSelection } from '@/constants/avatar';
import { useSessionStore } from '@/features/auth';
import { avatarErrorMessage, avatarSelectionFrom, saveAvatar } from '@/features/avatar';

/** Choose a preset avatar, preview it, and save the stored `{ hair, skin, shirt }` JSON. */
export default function AvatarScreen() {
  const profile = useSessionStore((state) => state.profile);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  const barHeight = useBottomBarHeight();

  const storedAvatar = profile?.avatar ?? null;
  const [selection, setSelection] = useState<AvatarSelection>(() =>
    avatarSelectionFrom(storedAvatar),
  );
  const [syncedAvatar, setSyncedAvatar] = useState(storedAvatar);
  const [pending, setPending] = useState(false);

  // The profile may resolve after this route mounts; keep the picker in step with the server
  // until the player starts choosing. A save always refreshes the profile before leaving.
  if (storedAvatar !== syncedAvatar) {
    setSyncedAvatar(storedAvatar);
    setSelection(avatarSelectionFrom(storedAvatar));
  }

  async function save() {
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
      router.back();
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
    <Screen title="Avatar" actions={<BackButton />}>
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <AvatarPicker
            selection={selection}
            onChange={setSelection}
            previewSize={112}
            optionSize={68}
          />

          <Button
            label={pending ? 'Saving…' : 'Save avatar'}
            size="lg"
            onPress={save}
            disabled={pending}
          />
          <Button label="Cancel" variant="ghost" disabled={pending} onPress={() => router.back()} />
        </ScrollView>
      </View>
    </Screen>
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
});
