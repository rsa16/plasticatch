import { router } from 'expo-router';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchStore } from '@/features/catch';
import { useGallery } from '@/features/gallery';

/** Step 2 of a catch: photograph the same litter going into a trash can. */
export default function DisposeScreen() {
  const xp = useCatchStore((state) => state.xp);
  const disposed = useCatchStore((state) => state.disposed);
  const complete = useCatchStore((state) => state.complete);
  const reset = useCatchStore((state) => state.reset);
  const gallery = useGallery();

  return (
    <CatchCamera
      instruction="STEP 2: Point the camera at a trash can with you throwing the same piece of litter out."
      xp={xp}
      failureMessage="Catch failed. Please show the litter going into the trash can."
      onVerified={(photo) => {
        disposed(photo);
        // Completion owns the record: the first call hands the pair to the gallery, repeat
        // calls return the same completion without adding another catch.
        complete((completion) =>
          gallery.addCatch({
            findPhoto: completion.findPhoto,
            disposePhoto: completion.disposePhoto,
          }),
        );
        // Replace so Back from Catch Complete can't reopen the camera for a counted catch.
        router.replace('/catch/complete');
      }}
      onClose={() => {
        reset();
        router.dismissTo('/map');
      }}
    />
  );
}
