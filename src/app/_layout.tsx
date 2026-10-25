import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/features/onboarding/draft';

// One query client for the app's lifetime. My Catches reads and writes through it.
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingDraftProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(onboard)" />
          {/* Full screen so the camera preview runs edge to edge. */}
          <Stack.Screen name="catch" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </OnboardingDraftProvider>
    </QueryClientProvider>
  );
}
