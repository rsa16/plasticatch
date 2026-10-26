import { router } from 'expo-router';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';
import { US_STATES } from '@/constants/us-states';
import { useSessionStore } from '@/features/auth';
import { canSubmitHomeState } from '@/features/onboarding/home-state';
import { homeStateErrorMessage, saveHomeState } from '@/features/onboarding/profile-service';

/** Change the explicit home state that scopes the leaderboard and map filter. */
export default function SettingsHomeStateScreen() {
  const profile = useSessionStore((state) => state.profile);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  const barHeight = useBottomBarHeight();
  const [selected, setSelected] = useState<string | null>(profile?.homeState ?? null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (pending || !canSubmitHomeState(selected)) return;

    // Saving the current state is a harmless no-op; leave without an extra round trip.
    if (selected === profile?.homeState) {
      router.back();
      return;
    }

    setPending(true);

    try {
      const result = await saveHomeState(selected);
      if (!result.success) {
        Alert.alert(
          'Could not save your home state',
          homeStateErrorMessage(result.code) ?? 'Choose your state and try again.',
        );
        return;
      }

      await refreshProfile();
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not save your home state',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <MenuScreen title="HOME STATE">
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <View style={styles.content}>
          <Text variant="prompt">Choose the state you catch litter in:</Text>

          <View style={styles.list} accessibilityRole="radiogroup">
            <ScrollPane thumbHeight={57}>
              {US_STATES.map((state) => {
                const isSelected = state.code === selected;
                return (
                  <Pressable
                    key={state.code}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={state.name}
                    onPress={() => setSelected(state.code)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Text variant="wheelItem" color={isSelected ? 'accent' : 'onSurface'}>
                      {state.name}
                    </Text>
                    {isSelected && (
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        tintColor={Brand.accent}
                        size={22}
                        weight="bold"
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollPane>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save home state"
            accessibilityState={{ disabled: pending || !canSubmitHomeState(selected) }}
            disabled={pending || !canSubmitHomeState(selected)}
            onPress={save}
            style={({ pressed }) => [
              styles.save,
              (pending || !canSubmitHomeState(selected)) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="buttonLabel">{pending ? 'SAVING…' : 'SAVE'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to settings"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text variant="caption" color="accent">
              Back to Settings
            </Text>
          </Pressable>
        </View>
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
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: 18,
    paddingRight: 28,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 8,
    paddingRight: 8,
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
  back: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
