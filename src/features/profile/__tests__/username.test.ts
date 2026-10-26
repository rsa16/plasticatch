import { DELETE_ACCOUNT_UNAVAILABLE, cooldownMessage, usernameToSave } from '@/features/profile';

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

describe('delete account notice', () => {
  it('says nothing was deleted', () => {
    expect(DELETE_ACCOUNT_UNAVAILABLE).toContain('not available yet');
    expect(DELETE_ACCOUNT_UNAVAILABLE).toContain('Nothing was deleted');
  });
});
