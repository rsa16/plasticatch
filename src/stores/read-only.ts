import { Camera } from 'expo-camera';
import { getForegroundPermissionsAsync, requestForegroundPermissionsAsync } from 'expo-location';
import { create } from 'zustand';

import type { PermissionSnapshot } from '@/features/permissions/read-only';

/** The two permission answers read-only mode depends on. `null` means not read yet. */
export type ReadOnlyPermissions = {
  camera: PermissionSnapshot | null;
  location: PermissionSnapshot | null;
};

type ReadOnlyStore = ReadOnlyPermissions & {
  /** Read both permissions without prompting. Called on launch and on app foreground. */
  refresh: () => Promise<ReadOnlyPermissions>;
  /**
   * Prompt for whichever permission is missing, camera first. Returns the answers after the
   * prompts so the caller can decide whether the Catch action can open.
   */
  request: () => Promise<ReadOnlyPermissions>;
};

/**
 * The read-only mode state. It is derived from the OS permissions rather than stored separately:
 * every refresh or prompt replaces the snapshots, and the banner and Catch button recompute from
 * them. Module-scoped so a grant made in the onboarding explainer or the OS Settings app reaches
 * the app shell without a restart.
 */
export const useReadOnlyStore = create<ReadOnlyStore>()((set, get) => ({
  camera: null,
  location: null,

  refresh: async () => {
    const current = get();
    const [camera, location] = await Promise.all([readCamera(), readLocation()]);
    const state = merged(current, { camera, location });
    set(state);
    return state;
  },

  request: async () => {
    const current = get();
    const camera = current.camera?.status === 'granted' ? current.camera : await askCamera();
    const location =
      current.location?.status === 'granted' ? current.location : await askLocation();
    const state = merged(current, { camera, location });
    set(state);
    return state;
  },
}));

/**
 * A platform that cannot answer (web, an unsupported build) keeps the previous snapshot rather
 * than flipping the app into read-only mode because a read failed.
 */
function merged(current: ReadOnlyPermissions, next: ReadOnlyPermissions): ReadOnlyPermissions {
  return {
    camera: next.camera ?? current.camera,
    location: next.location ?? current.location,
  };
}

async function readCamera(): Promise<PermissionSnapshot | null> {
  try {
    return snapshot(await Camera.getCameraPermissionsAsync());
  } catch {
    return null;
  }
}

async function askCamera(): Promise<PermissionSnapshot | null> {
  try {
    return snapshot(await Camera.requestCameraPermissionsAsync());
  } catch {
    return null;
  }
}

async function readLocation(): Promise<PermissionSnapshot | null> {
  try {
    return snapshot(await getForegroundPermissionsAsync());
  } catch {
    return null;
  }
}

async function askLocation(): Promise<PermissionSnapshot | null> {
  try {
    return snapshot(await requestForegroundPermissionsAsync());
  } catch {
    return null;
  }
}

function snapshot(response: { status: string; canAskAgain: boolean }): PermissionSnapshot {
  return {
    status:
      response.status === 'granted' ||
      response.status === 'undetermined' ||
      response.status === 'denied'
        ? response.status
        : 'denied',
    canAskAgain: response.canAskAgain,
  };
}
