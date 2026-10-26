import {
  Gabarito_400Regular,
  Gabarito_500Medium,
  Gabarito_600SemiBold,
  Gabarito_700Bold,
  Gabarito_800ExtraBold,
  Gabarito_900Black,
  useFonts,
} from '@expo-google-fonts/gabarito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSessionStore } from '@/features/auth';
import { ThemeProvider, useTheme } from '@/theme';

// Hold the splash until the display face is ready, so no screen flashes in the system font.
void SplashScreen.preventAutoHideAsync();

// One query client for the app's lifetime. My Catches reads and writes through it.
const queryClient = new QueryClient();

export default function RootLayout() {
  const initialize = useSessionStore((state) => state.initialize);
  const refreshSession = useSessionStore((state) => state.refreshSession);
  const [fontsLoaded, fontError] = useFonts({
    Gabarito_400Regular,
    Gabarito_500Medium,
    Gabarito_600SemiBold,
    Gabarito_700Bold,
    Gabarito_800ExtraBold,
    Gabarito_900Black,
  });

  // Resolve the persisted session once, then re-check it whenever the app comes back to the
  // foreground, because a backgrounded app can miss a token refresh.
  useEffect(() => {
    void initialize();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshSession();
    });
    return () => subscription.remove();
  }, [initialize, refreshSession]);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedChrome>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(onboard)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="auth/callback" />
            {/* Full screen so the camera preview runs edge to edge. */}
            <Stack.Screen name="catch" options={{ presentation: 'fullScreenModal' }} />
          </Stack>
        </ThemedChrome>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/** Keeps the OS status bar and window background in step with the active theme. */
function ThemedChrome({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.color.bg).catch(() => undefined);
  }, [theme.color.bg]);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
}
