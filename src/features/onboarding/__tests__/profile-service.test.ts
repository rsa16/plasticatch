import {
  homeStateErrorMessage,
  toProfileWriteResult,
  toUsernameCheck,
  usernameErrorMessage,
} from '@/features/onboarding/profile-service';

describe('toUsernameCheck', () => {
  it('reads an available answer', () => {
    expect(toUsernameCheck({ available: true, username: 'cryptic' })).toStrictEqual({
      available: true,
      code: null,
    });
  });

  it('reads a rejection with its code', () => {
    expect(toUsernameCheck({ available: false, code: 'username_taken' })).toStrictEqual({
      available: false,
      code: 'username_taken',
    });
  });

  it('treats a malformed payload as unavailable', () => {
    expect(toUsernameCheck(null)).toStrictEqual({ available: false, code: null });
  });
});

describe('toProfileWriteResult', () => {
  it('reads a success', () => {
    expect(toProfileWriteResult({ success: true, username: 'cryptic' })).toStrictEqual({
      success: true,
      code: null,
      retryAt: null,
      remainingSeconds: null,
    });
  });

  it('reads a cooldown rejection with its retry window', () => {
    expect(
      toProfileWriteResult({
        success: false,
        code: 'username_cooldown',
        retry_at: '2026-11-08T10:00:00+00:00',
        remaining_seconds: 1209600,
      }),
    ).toStrictEqual({
      success: false,
      code: 'username_cooldown',
      retryAt: '2026-11-08T10:00:00+00:00',
      remainingSeconds: 1209600,
    });
  });
});

describe('usernameErrorMessage', () => {
  it('explains each server rejection', () => {
    expect(usernameErrorMessage('invalid_username')).toContain('3–20 characters');
    expect(usernameErrorMessage('username_not_allowed')).toContain('not allowed');
    expect(usernameErrorMessage('username_taken')).toContain('already taken');
    expect(usernameErrorMessage('username_cooldown')).toContain('recently');
  });

  it('falls back for an unknown code and stays quiet with none', () => {
    expect(usernameErrorMessage('something_new')).toBeTruthy();
    expect(usernameErrorMessage(null)).toBeNull();
  });
});

describe('homeStateErrorMessage', () => {
  it('explains a server rejection and stays quiet on success', () => {
    expect(homeStateErrorMessage('invalid_home_state')).toContain('50 states');
    expect(homeStateErrorMessage('sign_in_required')).toContain('Sign in again');
    expect(homeStateErrorMessage('something_new')).toBeTruthy();
    expect(homeStateErrorMessage(null)).toBeNull();
  });
});
