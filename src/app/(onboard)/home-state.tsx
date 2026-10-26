import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Brand } from '@/constants/theme';
import { US_STATES, type UsState } from '@/constants/us-states';
import { useSessionStore } from '@/features/auth';
import { goBackOr } from '@/features/onboarding/back';
import { canSubmitHomeState } from '@/features/onboarding/home-state';
import { homeStateErrorMessage, saveHomeState } from '@/features/onboarding/profile-service';

const THUMB_HEIGHT = 57;

export default function HomeStateScreen() {
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
      step={3}
      onBack={() => goBackOr('/profile')}
      onNext={handleNext}
      nextDisabled={pending || !canSubmitHomeState(selected)}
    >
      <OnboardingHeading>Home State</OnboardingHeading>
      <OnboardingPrompt>Choose the state you catch litter in:</OnboardingPrompt>

      <View style={styles.list} accessibilityRole="radiogroup">
        <ScrollPane thumbHeight={THUMB_HEIGHT}>
          {US_STATES.map((state) => (
            <StateRow
              key={state.code}
              state={state}
              selected={state.code === selected}
              onSelect={() => setSelected(state.code)}
            />
          ))}
        </ScrollPane>
      </View>
    </OnboardingScreen>
  );
}

type StateRowProps = {
  state: UsState;
  selected: boolean;
  onSelect: () => void;
};

function StateRow({ state, selected, onSelect }: StateRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={state.name}
      onPress={onSelect}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text variant="wheelItem" color={selected ? 'accent' : 'onSurface'}>
        {state.name}
      </Text>
      {selected && (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          tintColor={Brand.accent}
          size={22}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 8,
    paddingRight: 8,
  },
  pressed: {
    opacity: 0.6,
  },
});
