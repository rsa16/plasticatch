import { router } from 'expo-router';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchStore, verifyCatchStep } from '@/features/catch';
import { useRecordCatch } from '@/features/my-catches';

/** Step 2 of a catch: photograph the same litter going into a trash can. */
export default function DisposeScreen() {
  const xp = useCatchStore((state) => state.xp);
  const findPhoto = useCatchStore((state) => state.findPhoto);
  const disposed = useCatchStore((state) => state.disposed);
  const complete = useCatchStore((state) => state.complete);
  const reset = useCatchStore((state) => state.reset);
  const recordCatch = useRecordCatch();

  return (
    <CatchCamera
      instruction="STEP 2: Point the camera at a trash can with you throwing the same piece of litter out."
      xp={xp}
      failureMessage="Catch failed. Please show the litter going into the trash can."
      verify={async (photo) => {
        // Dispose only opens after a verified Find photo; without one there is nothing to compare.
        if (!findPhoto) throw new Error('No Find photo to compare against');
        return verifyCatchStep('dispose', [findPhoto, photo]);
      }}
      onVerified={(photo) => {
        disposed(photo);
        // Completion owns the record: the first call hands the pair to the My Catches mutation,
        // repeat calls return the same completion without writing another catch.
        complete((completion) => {
          recordCatch.mutate({
            findPhoto: completion.findPhoto,
            disposePhoto: completion.disposePhoto,
          });
        });
        // Replace so Complete takes Dispose's place in the stack. A hardware Back from Complete
        // pops to Find, which the Catch layout guard redirects out of the completed flow.
        router.replace('/catch/complete');
      }}
      onClose={() => {
        reset();
        router.dismissTo('/map');
      }}
    />
  );
}
