import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(onboard)" />
      <Stack.Screen name="catch" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
