import { router } from 'expo-router';

import { CatchCamera } from '@/components/catch-camera';
import { useCatchSession } from '@/features/catch';
import { useGallery } from '@/features/gallery';

/** Step 2 of a catch: photograph the same litter going into a trash can. */
export default function DisposeScreen() {
  const session = useCatchSession();
  const gallery = useGallery();

  return (
    <CatchCamera
      instruction="STEP 2: Point the camera at a trash can with you throwing the same piece of litter out."
      xp={session.xp}
      failureMessage="Catch failed. Please show the litter going into the trash can."
      onVerified={(photo) => {
        session.disposed(photo);
        // Step 2 only opens after a verified Find photo, so the pair is complete here.
        if (session.findPhoto) {
          gallery.addCatch({ findPhoto: session.findPhoto, disposePhoto: photo });
        }
        // Replace so Back from Catch Complete can't reopen the camera for a counted catch.
        router.replace('/catch/complete');
      }}
      onClose={() => router.dismissTo('/map')}
    />
  );
}
