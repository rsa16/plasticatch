import { router } from 'expo-router';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchStore } from '@/features/catch';
import { prepareCapture } from '@/features/verification/pipeline';

/** Step 1 of a catch: photograph the litter. */
export default function FindScreen() {
  const found = useCatchStore((state) => state.found);
  const reset = useCatchStore((state) => state.reset);

  return (
    <CatchCamera
      instruction="Point the camera at a piece of litter."
      xp={0}
      failureMessage="Catch failed. Please make sure the litter is clearly in view."
      prepare={prepareCapture}
      onCaptured={(capture) => {
        found(capture);
        router.push('/catch/dispose');
      }}
      onClose={() => {
        reset();
        router.dismissTo('/map');
      }}
    />
  );
}
