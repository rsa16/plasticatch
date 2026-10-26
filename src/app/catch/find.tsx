import { router } from 'expo-router';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchStore, verifyCatchStep } from '@/features/catch';

/** Dismiss the Catch flow and return to the app shell's default screen. */
function backToMap() {
  router.dismissTo('/map');
}

/** Step 1 of a catch: photograph the litter. */
export default function FindScreen() {
  const xp = useCatchStore((state) => state.xp);
  const found = useCatchStore((state) => state.found);
  const reset = useCatchStore((state) => state.reset);

  return (
    <CatchCamera
      instruction="STEP 1: Point the camera at a piece of litter."
      xp={xp}
      failureMessage="Catch failed. Please make sure the litter is clearly in view."
      verify={(photo) => verifyCatchStep('find', [photo])}
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
