/**
 * The read-only decision: what the camera and foreground-location answers mean for the Catch
 * action, and what the next attempt should do about them.
 *
 * This module is pure so the derivation and the re-prompt choice can be tested without a device.
 * The store that reads the OS permissions lives in `src/stores/read-only.ts`.
 */

/** The subset of an OS permission answer the read-only decision needs. */
export type PermissionSnapshot = {
  status: 'granted' | 'undetermined' | 'denied';
  /** Whether the OS will still show its prompt for this permission. */
  canAskAgain: boolean;
};

/** A permission the player has not granted yet. */
export type PermissionIssue = 'camera' | 'location';

/** Whether the app is read-only, and which permissions keep it there. */
export type ReadOnlyStatus = {
  readOnly: boolean;
  blockedBy: PermissionIssue[];
};

/** What pressing a blocked action should do next. */
export type PermissionRecovery = 'none' | 'request' | 'settings';

type RecoveryOptions = {
  /**
   * Whether the platform has an OS settings screen that can grant the permission. The browser
   * has none, so it can only be asked again.
   */
  settingsAvailable?: boolean;
};

/**
 * Read-only mode is on when either permission is known and not granted. A `null` snapshot means
 * the answer is still loading; it never blocks on its own, so the banner does not flash on launch.
 */
export function deriveReadOnly(
  camera: PermissionSnapshot | null,
  location: PermissionSnapshot | null,
): ReadOnlyStatus {
  const blockedBy: PermissionIssue[] = [];
  if (camera && !isGranted(camera)) blockedBy.push('camera');
  if (location && !isGranted(location)) blockedBy.push('location');
  return { readOnly: blockedBy.length > 0, blockedBy };
}

/** A short, screen-reader-friendly explanation of what read-only mode is waiting for. */
export function readOnlyReason(status: ReadOnlyStatus): string {
  if (status.blockedBy.length === 2) return 'Camera and location access are off.';
  if (status.blockedBy[0] === 'camera') return 'Camera access is off.';
  if (status.blockedBy[0] === 'location') return 'Location access is off.';
  return '';
}

/**
 * What asking for one permission should do. A denied permission that the OS will not ask about
 * again can only be changed in Settings; everything else can still be prompted.
 */
export function recoveryFor(
  permission: PermissionSnapshot | null,
  { settingsAvailable = true }: RecoveryOptions = {},
): PermissionRecovery {
  if (permission && isGranted(permission)) return 'none';
  if (!permission || permission.canAskAgain || !settingsAvailable) return 'request';
  return 'settings';
}

/**
 * What the next Catch attempt should do. If any missing permission can still be prompted, ask
 * again; only fall back to Settings when the OS has stopped asking for all of them.
 */
export function recoveryForReadOnly(
  camera: PermissionSnapshot | null,
  location: PermissionSnapshot | null,
  options: RecoveryOptions = {},
): PermissionRecovery {
  const status = deriveReadOnly(camera, location);
  if (!status.readOnly) return 'none';

  const recoveries = status.blockedBy.map((issue) =>
    recoveryFor(issue === 'camera' ? camera : location, options),
  );
  return recoveries.includes('request') ? 'request' : 'settings';
}

function isGranted(permission: PermissionSnapshot): boolean {
  return permission.status === 'granted';
}
