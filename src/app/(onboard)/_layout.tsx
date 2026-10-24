import { Stack } from 'expo-router';

export default function OnboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="date-of-birth" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="all-set" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
