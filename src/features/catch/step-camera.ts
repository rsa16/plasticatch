import type { CameraPermission, CatchCameraAdapter } from './step';

/** What the display adapter must supply for the step to drive VisionCamera. */
export type VisionCameraAdapterOptions = {
  /** Read the latest permission from `useCameraPermission`. */
  getPermission: () => CameraPermission | null;
  /** Ask for the permission (or open Settings). */
  requestPermission: () => Promise<unknown>;
  /** Capture one JPEG and resolve with a `file://` URI. */
  capturePhoto: () => Promise<string>;
  /** Stop the preview and abandon an in-flight capture. */
  cancel: () => void;
};

/**
 * Bind the framework-free Catch step to the VisionCamera photo output.
 *
 * VisionCamera writes the original to a temporary file; the privacy pipeline in
 * `features/verification` hashes it, blurs faces and deletes it before anything is uploaded.
 */
export function createVisionCameraAdapter({
  getPermission,
  requestPermission,
  capturePhoto,
  cancel,
}: VisionCameraAdapterOptions): CatchCameraAdapter {
  return {
    permission: getPermission,

    requestPermission: async () => {
      await requestPermission();
    },

    takePhoto: capturePhoto,

    cancel,
  };
}
