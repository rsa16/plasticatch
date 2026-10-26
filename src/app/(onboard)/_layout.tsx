import { Stack } from 'expo-router';

import { useSessionStore } from '@/features/auth';
import { canContinueOnboarding } from '@/features/onboarding/age';
import { useOnboardingDraftStore } from '@/features/onboarding/draft';

export default function OnboardLayout() {
  const draft = useOnboardingDraftStore();
  const status = useSessionStore((state) => state.status);
  // The date wheel and the dead end are the only steps reachable before the gate clears. A
  // signed-in player returning to finish onboarding has already passed it.
  const admitted = canContinueOnboarding(draft, new Date()) || status === 'signed-in';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="date-of-birth" />
      <Stack.Protected guard={admitted}>
        <Stack.Screen name="profile" />
        <Stack.Screen name="avatar" />
        <Stack.Screen name="home-state" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="all-set" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Screen name="blocked" />
    </Stack>
  );
}
