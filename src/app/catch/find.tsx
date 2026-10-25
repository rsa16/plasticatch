import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchStore } from '@/features/catch';

/** Dismiss the Catch flow and return to the app shell's default screen. */
function backToMap() {
  router.dismissTo('/map');
}

/** Step 1 of a catch: photograph the litter. */
export default function FindScreen() {
  const xp = useCatchStore((state) => state.xp);
  const found = useCatchStore((state) => state.found);
  const completion = useCatchStore((state) => state.completion);
  const reset = useCatchStore((state) => state.reset);

  // Back from Catch Complete pops to this still-mounted Find screen. A completed catch has no
  // capture left to take, so drop it and leave the flow instead of showing its stale XP.
  useFocusEffect(
    useCallback(() => {
      if (!completion) return;
      reset();
      backToMap();
    }, [completion, reset]),
  );

  return (
    <CatchCamera
      instruction="STEP 1: Point the camera at a piece of litter."
      xp={xp}
      failureMessage="Catch failed. Please make sure the litter is clearly in view."
      onVerified={(photo) => {
        found(photo);
        router.push('/catch/dispose');
      }}
      onClose={() => {
        reset();
        backToMap();
      }}
    />
  );
}
