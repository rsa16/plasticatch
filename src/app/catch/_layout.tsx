import { Stack } from 'expo-router';

import { CatchSessionProvider } from '@/features/catch';

export default function CatchLayout() {
  return (
    <CatchSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="find" />
        <Stack.Screen name="dispose" />
        {/* The catch is already counted, so there's no swiping back to the camera. */}
        <Stack.Screen name="complete" options={{ gestureEnabled: false }} />
      </Stack>
    </CatchSessionProvider>
  );
}
