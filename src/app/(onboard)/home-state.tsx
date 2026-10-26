import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Card, Divider } from '@/components/ui/card';
import { US_STATES, type UsState } from '@/constants/us-states';
import { useSessionStore } from '@/features/auth';
import { goBackOr } from '@/features/onboarding/back';
import { canSubmitHomeState } from '@/features/onboarding/home-state';
import { homeStateErrorMessage, saveHomeState } from '@/features/onboarding/profile-service';
import { useTheme } from '@/theme';

export default function HomeStateScreen() {
  const theme = useTheme();
  const profile = useSessionStore((state) => state.profile);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  // Returning to the step restores the state already on the profile, if there is one.
  const [selected, setSelected] = useState<string | null>(profile?.homeState ?? null);
  const [pending, setPending] = useState(false);

  // The state is an explicit choice, never inferred from live GPS, and cannot be skipped: the
  // server validates the code, and a failed write keeps the player on this step.
  async function handleNext() {
    if (pending || !canSubmitHomeState(selected)) return;
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
      router.push('/permissions');
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
    <OnboardingScreen
      step={4}
      onBack={() => goBackOr('/profile')}
      onNext={handleNext}
      nextDisabled={pending || !canSubmitHomeState(selected)}
    >
      <OnboardingHeading>Home State</OnboardingHeading>
      <OnboardingPrompt>Choose the state you catch litter in:</OnboardingPrompt>

      <Card padded={false} style={styles.list}>
        <View style={styles.listInner} accessibilityRole="radiogroup">
          <ScrollPane thumbHeight={48}>
            {US_STATES.map((state, index) => (
              <View key={state.code}>
                {index > 0 && <Divider />}
                <StateRow
                  state={state}
                  selected={state.code === selected}
                  onSelect={() => setSelected(state.code)}
                />
              </View>
            ))}
          </ScrollPane>
        </View>
      </Card>
      <View style={{ height: theme.space.sm }} />
    </OnboardingScreen>
  );
}

type StateRowProps = {
  state: UsState;
  selected: boolean;
  onSelect: () => void;
};

function StateRow({ state, selected, onSelect }: StateRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={state.name}
      onPress={onSelect}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text variant="body" tone={selected ? 'accent' : 'default'}>
        {state.name}
      </Text>
      {selected && (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          tintColor={theme.color.accent}
          size={20}
          weight="bold"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listInner: {
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
    opacity: 0.6,
  },
});
