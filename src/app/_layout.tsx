import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/features/onboarding/draft';

export default function RootLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(onboard)" />
        <Stack.Screen name="catch" options={{ presentation: 'modal' }} />
      </Stack>
    </OnboardingDraftProvider>
  );
}
