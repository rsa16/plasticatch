import { Stack } from 'expo-router';

/**
 * The signed-out route group.
 *
 * Expo Router needs a layout for `(auth)` to exist as a nested navigator; without one the root
 * `<Stack.Screen name="(auth)" />` warns and the group is only reachable by its full child name.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
