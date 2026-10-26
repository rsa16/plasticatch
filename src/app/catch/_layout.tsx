import { Stack, router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useCatchStore } from '@/features/catch';

export default function CatchLayout() {
  const pathname = usePathname();
  const hasFind = useCatchStore((state) => Boolean(state.find));
  const hasDispose = useCatchStore((state) => Boolean(state.dispose));
  const completed = useCatchStore((state) => Boolean(state.completion));
  const rejected = useCatchStore((state) => Boolean(state.rejection));
  const reset = useCatchStore((state) => state.reset);

  // Leaving the Catch modal (back gesture, close, DONE) drops the finished catch.
  useEffect(() => () => reset(), [reset]);

  const segments = pathname.split('/').filter(Boolean);
  const step = segments[segments.length - 1];

  // Each route is earned by the state before it. A cold deep link cannot skip a step or show a
  // verdict the session does not have.
  let redirect: '/catch/find' | '/map' | null = null;
  if (step === 'dispose' && !hasFind) redirect = '/catch/find';
  else if (step === 'verifying' && (!hasFind || !hasDispose)) redirect = '/catch/find';
  else if (step === 'success' && !completed) redirect = '/map';
  else if (step === 'reject' && !rejected) redirect = '/map';
  // A settled catch cannot go back to the camera.
  else if (step === 'find' && (completed || rejected)) redirect = '/map';

  // Redirect from an effect rather than by rendering a <Redirect> in place of the Stack: the
  // navigator must stay mounted, or expo-router reports ROUTE_NAMES_CHANGED for the catch routes
  // and can fail to seed an initial navigation state on a cold start.
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="find" />
      <Stack.Screen name="dispose" />
      {/* No swiping back out of an in-flight verification or a finished catch. */}
      <Stack.Screen name="verifying" options={{ gestureEnabled: false }} />
      <Stack.Screen name="success" options={{ gestureEnabled: false }} />
      <Stack.Screen name="reject" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
