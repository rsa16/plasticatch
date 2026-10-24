import { Stack } from 'expo-router';

export default function CatchLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="find" />
    </Stack>
  );
}
