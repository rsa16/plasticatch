import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AvatarHead } from '@/components/avatar-head';
import { useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import {
  AVATAR_PARTS,
  avatarPresets,
  type AvatarPart,
  type AvatarSelection,
} from '@/constants/avatar';
import { Brand, Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth';
import {
  avatarErrorMessage,
  avatarSelectionFrom,
  saveAvatar,
  withAvatarPart,
} from '@/features/avatar';

const PART_LABELS: Record<AvatarPart, string> = {
  hair: 'Hair',
  skin: 'Skin',
  shirt: 'Shirt',
};

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
  const [part, setPart] = useState<AvatarPart>('hair');
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
    <MenuScreen title="AVATAR">
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <ScrollPane
          thumbHeight={104}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.preview}>
            <AvatarHead avatar={selection} size={128} label="Avatar preview" />
            <Text variant="body" style={styles.previewHint}>
              This head marks you on the Map and leaderboard.
            </Text>
          </View>

          <View style={styles.tabs} accessibilityRole="tablist">
            {AVATAR_PARTS.map((candidate) => {
              const active = candidate === part;
              return (
                <Pressable
                  key={candidate}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={PART_LABELS[candidate]}
                  onPress={() => setPart(candidate)}
                  style={({ pressed }) => [
                    styles.tab,
                    active && styles.tabActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text variant="body" color={active ? 'accent' : 'onSurface'}>
                    {PART_LABELS[candidate]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={styles.grid}
            accessibilityRole="radiogroup"
            accessibilityLabel={PART_LABELS[part]}
          >
            {avatarPresets(part).map((preset) => {
              const active = selection[part] === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={preset.label}
                  accessibilityHint="Preview this preset"
                  onPress={() =>
                    setSelection((current) => withAvatarPart(current, part, preset.id))
                  }
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <AvatarHead avatar={withAvatarPart(selection, part, preset.id)} size={56} />
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save avatar"
            accessibilityState={{ disabled: pending }}
            disabled={pending}
            onPress={save}
            style={({ pressed }) => [
              styles.save,
              pending && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="buttonLabel">{pending ? 'SAVING…' : 'SAVE'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel and keep the stored avatar"
            disabled={pending}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text variant="caption" color="accent">
              Cancel
            </Text>
          </Pressable>
        </ScrollPane>
      </View>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    marginTop: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: 18,
    paddingRight: 28,
    paddingBottom: Spacing.six,
  },
  preview: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  previewHint: {
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  tabActive: {
    borderWidth: 2,
    borderColor: Brand.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  option: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: Brand.accent,
  },
  save: {
    alignSelf: 'center',
    minWidth: 160,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  cancel: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
