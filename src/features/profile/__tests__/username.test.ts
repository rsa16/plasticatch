import {
  USERNAME_COOLDOWN_MS,
  cooldownMessage,
  formatCooldownRemaining,
  usernameCooldownLabel,
  usernameCooldownRemaining,
  usernameToSave,
} from '@/features/profile';

describe('usernameToSave', () => {
  it('normalises a new name', () => {
    expect(usernameToSave('  NewName ', 'oldname')).toBe('newname');
  });

  it('saves nothing for an empty field', () => {
    expect(usernameToSave('   ', 'oldname')).toBeNull();
  });

  it('saves nothing when the name is unchanged, ignoring case and spacing', () => {
    expect(usernameToSave('OldName', 'oldname')).toBeNull();
    expect(usernameToSave(' oldname ', 'oldname')).toBeNull();
  });

  it('treats a first-time set as a change', () => {
    expect(usernameToSave('newname', null)).toBe('newname');
  });
});

describe('cooldownMessage', () => {
  it('names the day the next change is allowed', () => {
    const message = cooldownMessage('2026-11-08T10:00:00.000Z');

    expect(message).toContain('November 8, 2026');
  });

  it('falls back when the retry time is missing or unreadable', () => {
    expect(cooldownMessage(null)).toContain('recently');
    expect(cooldownMessage('not-a-date')).toContain('recently');
  });
});

describe('usernameCooldownRemaining', () => {
  const changedAt = '2026-10-01T12:00:00.000Z';
  const changed = new Date(changedAt).getTime();

  it('is zero when the name has never changed', () => {
    expect(usernameCooldownRemaining(null, changed)).toBe(0);
  });

  it('counts down from the change time', () => {
    expect(usernameCooldownRemaining(changedAt, changed)).toBe(USERNAME_COOLDOWN_MS);
    expect(usernameCooldownRemaining(changedAt, changed + USERNAME_COOLDOWN_MS - 1000)).toBe(1000);
  });

  it('is zero once the window has elapsed', () => {
    expect(usernameCooldownRemaining(changedAt, changed + USERNAME_COOLDOWN_MS)).toBe(0);
  });

  it('treats an unreadable timestamp as no local cooldown', () => {
    expect(usernameCooldownRemaining('not-a-date', changed)).toBe(0);
  });
});

describe('cooldown display', () => {
  it('picks the largest readable unit', () => {
    expect(formatCooldownRemaining(USERNAME_COOLDOWN_MS)).toBe('14 days');
    expect(formatCooldownRemaining(USERNAME_COOLDOWN_MS - 3 * 24 * 60 * 60 * 1000)).toBe('11 days');
    expect(formatCooldownRemaining(2 * 60 * 60 * 1000)).toBe('2 hours');
    expect(formatCooldownRemaining(5 * 60 * 1000)).toBe('5 minutes');
    expect(formatCooldownRemaining(1)).toBe('1 minute');
  });

  it('shows the remaining wait only while the cooldown is active', () => {
    const changedAt = '2026-10-01T12:00:00.000Z';
    const changed = new Date(changedAt).getTime();

    expect(usernameCooldownLabel(changedAt, changed + 60_000)).toContain('14 days');
    expect(usernameCooldownLabel(changedAt, changed + USERNAME_COOLDOWN_MS)).toBeNull();
    expect(usernameCooldownLabel(null, changed)).toBeNull();
  });
});
