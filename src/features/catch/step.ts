/**
 * One Catch step: permission, camera readiness, capture, verification, cancellation and failure.
 *
 * The module is framework-free. It is driven by a camera adapter and an injected verifier, so
 * tests run against fakes and never open a real camera or roll uncontrolled randomness. The
 * component that renders it only displays the state and forwards user presses.
 */

/** The state of the camera permission as the OS reports it. */
export type CameraPermission = {
  granted: boolean;
  canAskAgain: boolean;
};

/** What the step needs from a camera. Tests supply a fake; the app supplies `expo-camera`. */
export type CatchCameraAdapter = {
  /** The current permission, or `null` while it is still being read. */
  permission: () => CameraPermission | null;
  /** Ask the OS for permission (or send the player to Settings). */
  requestPermission: () => Promise<void>;
  /** Capture one photo and resolve with its URI. */
  takePhoto: () => Promise<string>;
  /** Stop the preview and abandon an in-flight capture. */
  cancel: () => void;
};

/** Where a step is in its one-capture lifecycle. */
export type CatchStepStatus =
  'not-ready' | 'ready' | 'capturing' | 'verifying' | 'failed' | 'captured';

/** Everything the display adapter renders for one step. */
export type CatchStepState = {
  status: CatchStepStatus;
  permission: CameraPermission | null;
  /** Failure copy for the popup, or `null` when nothing has failed. */
  failure: string | null;
};

/** Copy shown when the camera itself fails, not when verification rejects the photo. */
export const CAMERA_FAILURE_MESSAGE = 'Couldn’t take a photo. Please try again.';

export type CatchStepOptions = {
  adapter: CatchCameraAdapter;
  /** Decides whether a captured photo counts. Injected so tests never roll `Math.random`. */
  verify: (photo: string) => boolean | Promise<boolean>;
  /** Copy shown when verification rejects the photo. */
  failureMessage: string;
  /** Called at most once per successful capture, and never after cancellation. */
  onCaptured: (photo: string) => void;
};

/** The framework-free step controller. Bind it to a view with a subscription. */
export type CatchStepController = {
  getState: () => CatchStepState;
  subscribe: (listener: () => void) => () => void;
  /** Re-read the permission after the OS prompt or a trip to Settings. */
  refreshPermission: () => void;
  requestPermission: () => Promise<void>;
  /** Tell the step that its one camera preview has mounted and is streaming. */
  cameraReady: () => void;
  capture: () => Promise<void>;
  /** Dismiss the failure popup so the shutter can be used again. */
  dismissFailure: () => void;
  /** Leave the step: no verified callback fires for an in-flight capture. */
  cancel: () => void;
};

/** Create the state machine for one camera step. */
export function createCatchStep({
  adapter,
  verify,
  failureMessage,
  onCaptured,
}: CatchStepOptions): CatchStepController {
  let state: CatchStepState = {
    status: 'not-ready',
    permission: adapter.permission(),
    failure: null,
  };
  let previewReady = false;
  let closed = false;
  let attempt = 0;
  const listeners = new Set<() => void>();

  const emit = (next: CatchStepState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const readyStatus = (): CatchStepStatus =>
    !closed && previewReady && state.permission?.granted ? 'ready' : 'not-ready';

  const refreshPermission = () => {
    const permission = adapter.permission();
    if (!permission?.granted) previewReady = false;

    if (state.status === 'not-ready' || state.status === 'ready') {
      emit({
        ...state,
        permission,
        status: !closed && previewReady && permission?.granted ? 'ready' : 'not-ready',
      });
      return;
    }

    emit({ ...state, permission });
  };

  return {
    getState: () => state,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    refreshPermission,

    requestPermission: async () => {
      await adapter.requestPermission();
      if (!closed) refreshPermission();
    },

    cameraReady: () => {
      previewReady = true;
      if (state.status === 'not-ready' || state.status === 'ready') {
        emit({ ...state, status: readyStatus() });
      }
    },

    capture: async () => {
      if (closed || state.status !== 'ready') return;

      const current = ++attempt;
      emit({ ...state, status: 'capturing', failure: null });

      try {
        const photo = await adapter.takePhoto();
        if (closed || current !== attempt) return;

        emit({ ...state, status: 'verifying' });
        const verified = await verify(photo);
        if (closed || current !== attempt) return;

        if (verified) {
          emit({ ...state, status: 'captured' });
          onCaptured(photo);
        } else {
          emit({ ...state, status: 'failed', failure: failureMessage });
        }
      } catch {
        if (closed || current !== attempt) return;
        emit({ ...state, status: 'failed', failure: CAMERA_FAILURE_MESSAGE });
      }
    },

    dismissFailure: () => {
      if (state.status !== 'failed') return;
      emit({ ...state, status: readyStatus(), failure: null });
    },

    cancel: () => {
      if (closed) return;
      closed = true;
      attempt += 1;
      adapter.cancel();
      if (state.status !== 'captured') {
        emit({ ...state, status: 'not-ready', failure: null });
      }
    },
  };
}
