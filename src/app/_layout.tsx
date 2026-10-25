import { Stack } from 'expo-router';

import { GalleryProvider } from '@/features/gallery';
import { OnboardingDraftProvider } from '@/features/onboarding/draft';

export default function RootLayout() {
  return (
    <OnboardingDraftProvider>
      <GalleryProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(onboard)" />
          {/* Full screen so the camera preview runs edge to edge. */}
          <Stack.Screen name="catch" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </GalleryProvider>
    </OnboardingDraftProvider>
  );
}
