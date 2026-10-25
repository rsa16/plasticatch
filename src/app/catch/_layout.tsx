import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useCatchStore } from '@/features/catch';

export default function CatchLayout() {
  const pathname = usePathname();
  const hasFindPhoto = useCatchStore((state) => Boolean(state.findPhoto));
  const completed = useCatchStore((state) => Boolean(state.completion));
  const reset = useCatchStore((state) => state.reset);

  // Leaving the Catch modal (back gesture, close, DONE) drops the finished catch. Resetting here
  // rather than on a step's mount keeps the completion visible while Complete renders.
  useEffect(() => () => reset(), [reset]);

  // Find is the only entry point; the other steps are earned by the lifecycle state above.
  const segments = pathname.split('/').filter(Boolean);
  const step = segments[segments.length - 1];
  if (step === 'dispose' && !hasFindPhoto) return <Redirect href="/catch/find" />;
  if (step === 'complete' && !completed) return <Redirect href="/map" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="find" />
      <Stack.Screen name="dispose" />
      {/* The catch is already counted, so there's no swiping back to the camera. */}
      <Stack.Screen name="complete" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
