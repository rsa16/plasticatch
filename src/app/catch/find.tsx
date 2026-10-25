import { router } from 'expo-router';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchSession } from '@/features/catch';

/** Dismiss the Catch flow and return to the app shell's default screen. */
function backToMap() {
  router.dismissTo('/map');
}

/** Step 1 of a catch: photograph the litter. */
export default function FindScreen() {
  const session = useCatchSession();

  return (
    <CatchCamera
      instruction="STEP 1: Point the camera at a piece of litter."
      xp={session.xp}
      failureMessage="Catch failed. Please make sure the litter is clearly in view."
      onVerified={(photo) => {
        session.found(photo);
        router.push('/catch/dispose');
      }}
      onClose={backToMap}
    />
  );
}
