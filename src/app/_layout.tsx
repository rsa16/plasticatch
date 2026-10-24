import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(onboard)" />
        <Stack.Screen name="catch" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
