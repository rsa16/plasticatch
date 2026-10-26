import { router } from 'expo-router';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchStore } from '@/features/catch';
import { prepareCapture } from '@/features/verification/pipeline';

/** Step 2 of a catch: photograph the same litter going into a trash can. */
export default function DisposeScreen() {
  const find = useCatchStore((state) => state.find);
  const disposed = useCatchStore((state) => state.disposed);
  const reset = useCatchStore((state) => state.reset);

  return (
    <CatchCamera
      instruction="Show the same litter going into a trash can."
      xp={0}
      failureMessage="Catch failed. Please show the litter going into the trash can."
      find={find}
      prepare={prepareCapture}
      onCaptured={(capture) => {
        disposed(capture);
        router.replace('/catch/verifying');
      }}
      onClose={() => {
        reset();
        router.dismissTo('/map');
      }}
    />
  );
}
