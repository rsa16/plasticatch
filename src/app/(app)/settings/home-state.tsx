import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { BackButton } from '@/components/ui/back-button';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { US_STATES } from '@/constants/us-states';
import { useSessionStore } from '@/features/auth';
import { canSubmitHomeState } from '@/features/onboarding/home-state';
import { homeStateErrorMessage, saveHomeState } from '@/features/onboarding/profile-service';
import { useTheme } from '@/theme';

/** Change the explicit home state that scopes the leaderboard and map filter. */
export default function SettingsHomeStateScreen() {
  const theme = useTheme();
  const profile = useSessionStore((state) => state.profile);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  const queryClient = useQueryClient();
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
      // The State board is scoped by home_state, so drop every cached board before leaving.
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
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
    <Screen title="Home state" actions={<BackButton />}>
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <View style={styles.content}>
          <Text variant="body" tone="muted">
            Choose the state you catch litter in:
          </Text>

          <Card padded={false} style={styles.list}>
            <ScrollPane thumbHeight={48}>
              {US_STATES.map((state, index) => {
                const isSelected = state.code === selected;
                return (
                  <View key={state.code}>
                    {index > 0 && <Divider />}
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={state.name}
                      onPress={() => setSelected(state.code)}
                      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    >
                      <Text variant="body" tone={isSelected ? 'accent' : 'default'}>
                        {state.name}
                      </Text>
                      {isSelected && (
                        <SymbolView
                          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                          tintColor={theme.color.accent}
                          size={20}
                          weight="bold"
                        />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollPane>
          </Card>

          <Button
            label={pending ? 'Saving…' : 'Save home state'}
            size="lg"
            onPress={save}
            disabled={pending || !canSubmitHomeState(selected)}
          />
          <Button label="Back to Settings" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
