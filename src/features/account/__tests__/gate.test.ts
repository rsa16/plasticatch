import {
  REAUTH_WINDOW_MS,
  canDeleteAccount,
  confirmationMatches,
  isReauthFresh,
  reauthMethodFor,
} from '@/features/account';

describe('reauthMethodFor', () => {
  it('asks for a password when the account has an email identity', () => {
    expect(
      reauthMethodFor({
        id: 'user-1',
        email: 'player@example.com',
        app_metadata: { provider: 'email' },
        identities: [{ provider: 'email' }],
      }),
    ).toBe('password');
  });

  it('re-runs the provider flow for a Google-only account', () => {
    expect(
      reauthMethodFor({
        id: 'user-1',
        email: 'player@example.com',
        app_metadata: { provider: 'google' },
        identities: [{ provider: 'google' }],
      }),
    ).toBe('google');
  });

  it('prefers a linked email identity when one exists', () => {
    expect(
      reauthMethodFor({
        id: 'user-1',
        email: 'player@example.com',
        app_metadata: { provider: 'google' },
        identities: [{ provider: 'google' }, { provider: 'email' }],
      }),
    ).toBe('password');
  });

  it('falls back to the provider metadata when identities are missing', () => {
    expect(reauthMethodFor({ id: 'user-1', app_metadata: { provider: 'google' } })).toBe('google');
  });

  it('has no method for an unknown or signed-out user', () => {
    expect(reauthMethodFor(null)).toBeNull();
    expect(reauthMethodFor({ id: 'user-1' })).toBeNull();
    expect(reauthMethodFor({ id: 'user-1', app_metadata: { provider: 'github' } })).toBeNull();
  });
});

describe('confirmationMatches', () => {
  it('requires the exact stored username', () => {
    expect(confirmationMatches('crypticcatch', 'crypticcatch')).toBe(true);
    expect(confirmationMatches('crypticcatch', 'CrypticCatch')).toBe(false);
    expect(confirmationMatches('crypticcatch', 'crypticcat')).toBe(false);
  });

  it('ignores only accidental surrounding whitespace', () => {
    expect(confirmationMatches('crypticcatch', '  crypticcatch  ')).toBe(true);
    expect(confirmationMatches('crypticcatch', 'cryptic catch')).toBe(false);
  });

  it('never matches when the account has no username', () => {
    expect(confirmationMatches(null, '')).toBe(false);
    expect(confirmationMatches(null, 'DELETE')).toBe(false);
    expect(confirmationMatches('', '')).toBe(false);
  });
});

describe('isReauthFresh', () => {
  const now = 1_800_000_000_000;

  it('accepts a sign-in inside the server window', () => {
    expect(isReauthFresh(now - REAUTH_WINDOW_MS + 1, now)).toBe(true);
  });

  it('rejects a missing or expired sign-in', () => {
    expect(isReauthFresh(null, now)).toBe(false);
    expect(isReauthFresh(now - REAUTH_WINDOW_MS, now)).toBe(false);
    expect(isReauthFresh(now - REAUTH_WINDOW_MS - 1, now)).toBe(false);
  });

  it('rejects a timestamp from the future beyond clock tolerance', () => {
    expect(isReauthFresh(now + 60_000, now)).toBe(false);
  });
});

describe('canDeleteAccount', () => {
  const now = 1_800_000_000_000;
  const fresh = now - 1_000;

  it('requires both an exact username and a fresh re-authentication', () => {
    expect(
      canDeleteAccount({
        username: 'crypticcatch',
        confirmation: 'crypticcatch',
        reauthenticatedAt: fresh,
        now,
      }),
    ).toBe(true);

    expect(
      canDeleteAccount({
        username: 'crypticcatch',
        confirmation: 'wrong',
        reauthenticatedAt: fresh,
        now,
      }),
    ).toBe(false);

    expect(
      canDeleteAccount({
        username: 'crypticcatch',
        confirmation: 'crypticcatch',
        reauthenticatedAt: null,
        now,
      }),
    ).toBe(false);
  });

  it('stays closed when the re-authentication has expired', () => {
    expect(
      canDeleteAccount({
        username: 'crypticcatch',
        confirmation: 'crypticcatch',
        reauthenticatedAt: now - REAUTH_WINDOW_MS,
        now,
      }),
    ).toBe(false);
  });
});
