import {
  deriveReadOnly,
  readOnlyReason,
  recoveryFor,
  recoveryForReadOnly,
  type PermissionSnapshot,
} from '../read-only';

const granted: PermissionSnapshot = { status: 'granted', canAskAgain: true };
const deniedAskable: PermissionSnapshot = { status: 'denied', canAskAgain: true };
const deniedBlocked: PermissionSnapshot = { status: 'denied', canAskAgain: false };
const undetermined: PermissionSnapshot = { status: 'undetermined', canAskAgain: true };

describe('deriveReadOnly', () => {
  it('does not claim read-only before the permissions are known', () => {
    expect(deriveReadOnly(null, null)).toEqual({ readOnly: false, blockedBy: [] });
  });

  it('is not read-only when camera and location are both granted', () => {
    expect(deriveReadOnly(granted, granted)).toEqual({ readOnly: false, blockedBy: [] });
  });

  it('is read-only when the camera is denied', () => {
    expect(deriveReadOnly(deniedAskable, granted)).toEqual({
      readOnly: true,
      blockedBy: ['camera'],
    });
  });

  it('is read-only when location is denied', () => {
    expect(deriveReadOnly(granted, deniedBlocked)).toEqual({
      readOnly: true,
      blockedBy: ['location'],
    });
  });

  it('reports both permissions when both are denied', () => {
    expect(deriveReadOnly(deniedAskable, deniedBlocked).blockedBy).toEqual(['camera', 'location']);
  });

  it('treats a permission the player has not answered yet as read-only', () => {
    expect(deriveReadOnly(undetermined, granted)).toEqual({
      readOnly: true,
      blockedBy: ['camera'],
    });
  });

  it('keeps a known answer when the other permission is still loading', () => {
    expect(deriveReadOnly(null, deniedAskable)).toEqual({
      readOnly: true,
      blockedBy: ['location'],
    });
  });
});

describe('readOnlyReason', () => {
  it('names the missing permissions in plain language', () => {
    expect(readOnlyReason({ readOnly: true, blockedBy: ['camera', 'location'] })).toBe(
      'Camera and location access are off.',
    );
    expect(readOnlyReason({ readOnly: true, blockedBy: ['camera'] })).toBe('Camera access is off.');
    expect(readOnlyReason({ readOnly: true, blockedBy: ['location'] })).toBe(
      'Location access is off.',
    );
  });

  it('says nothing when there is nothing to explain', () => {
    expect(readOnlyReason({ readOnly: false, blockedBy: [] })).toBe('');
  });
});

describe('recoveryFor', () => {
  it('does nothing when the permission is granted', () => {
    expect(recoveryFor(granted)).toBe('none');
  });

  it('asks the OS again while it still allows a prompt', () => {
    expect(recoveryFor(deniedAskable)).toBe('request');
    expect(recoveryFor(undetermined)).toBe('request');
  });

  it('opens Settings when the OS will not ask again', () => {
    expect(recoveryFor(deniedBlocked)).toBe('settings');
  });

  it('asks again on web, which has no OS settings screen to open', () => {
    expect(recoveryFor(deniedBlocked, { settingsAvailable: false })).toBe('request');
  });

  it('treats a still-loading permission as askable', () => {
    expect(recoveryFor(null)).toBe('request');
  });
});

describe('recoveryForReadOnly', () => {
  it('does nothing when no permission blocks the catch', () => {
    expect(recoveryForReadOnly(granted, granted)).toBe('none');
  });

  it('re-prompts while any missing permission can still be asked for', () => {
    expect(recoveryForReadOnly(deniedAskable, deniedBlocked)).toBe('request');
    expect(recoveryForReadOnly(deniedBlocked, deniedAskable)).toBe('request');
  });

  it('opens Settings only when every missing permission is blocked from asking', () => {
    expect(recoveryForReadOnly(deniedBlocked, granted)).toBe('settings');
    expect(recoveryForReadOnly(granted, deniedBlocked)).toBe('settings');
    expect(recoveryForReadOnly(deniedBlocked, deniedBlocked)).toBe('settings');
  });

  it('falls back to re-prompting on web', () => {
    expect(recoveryForReadOnly(deniedBlocked, deniedBlocked, { settingsAvailable: false })).toBe(
      'request',
    );
  });
});
