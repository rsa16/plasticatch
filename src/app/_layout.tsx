import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSessionStore } from '@/features/auth';

// One query client for the app's lifetime. My Catches reads and writes through it.
const queryClient = new QueryClient();

export default function RootLayout() {
  const initialize = useSessionStore((state) => state.initialize);
  const refreshSession = useSessionStore((state) => state.refreshSession);

  // Resolve the persisted session once, then re-check it whenever the app comes back to the
  // foreground, because a backgrounded app can miss a token refresh.
  useEffect(() => {
    void initialize();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshSession();
    });

    return () => subscription.remove();
  }, [initialize, refreshSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(onboard)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="auth/callback" />
        {/* Full screen so the camera preview runs edge to edge. */}
        <Stack.Screen name="catch" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
