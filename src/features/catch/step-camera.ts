import type { CameraView } from 'expo-camera';

import type { CameraPermission, CatchCameraAdapter } from './step';

/** What the display adapter must supply for the step to drive `expo-camera`. */
export type ExpoCameraAdapterOptions = {
  /** The one mounted preview, or `null` before it renders. */
  getCamera: () => CameraView | null;
  /** Read the latest permission from `useCameraPermissions`. */
  getPermission: () => CameraPermission | null;
  /** Ask for the permission (or open Settings). */
  requestPermission: () => Promise<unknown>;
};

/**
 * Bind the framework-free Catch step to the existing `expo-camera` preview. No new native
 * permission or camera library is involved: `takePictureAsync` is the only capture path.
 */
export function createExpoCameraAdapter({
  getCamera,
  getPermission,
  requestPermission,
}: ExpoCameraAdapterOptions): CatchCameraAdapter {
  return {
    permission: getPermission,

    requestPermission: async () => {
      await requestPermission();
    },

    takePhoto: async () => {
      const camera = getCamera();
      if (!camera) throw new Error('Camera is not ready');

      const photo = await camera.takePictureAsync({ quality: 0.7 });
      return photo.uri;
    },

    cancel: () => {
      // expo-camera has no "abort capture" call; unmounting the one preview releases it. The step
      // drops the in-flight result, so a late photo can never verify, complete, or navigate.
    },
  };
}
