import { Stack } from 'expo-router';

import { canContinueOnboarding } from '@/features/onboarding/age';
import { useOnboardingDraft } from '@/features/onboarding/draft';

export default function OnboardLayout() {
  const draft = useOnboardingDraft();
  // The date wheel and the dead end are the only steps reachable before the gate clears.
  const admitted = canContinueOnboarding(draft, new Date());

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="date-of-birth" />
      <Stack.Protected guard={admitted}>
        <Stack.Screen name="profile" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="all-set" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Screen name="blocked" />
    </Stack>
  );
}
