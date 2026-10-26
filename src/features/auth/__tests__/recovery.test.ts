import { isRecoveryRedirect, isRecoveryRedirectType } from '@/features/auth/recovery';

describe('isRecoveryRedirect', () => {
  it('recognises an implicit-flow recovery redirect', () => {
    expect(isRecoveryRedirect('plasticatch://auth/callback#access_token=x&type=recovery')).toBe(
      true,
    );
  });

  it('recognises a recovery marker in the query', () => {
    expect(isRecoveryRedirect('plasticatch://auth/callback?code=abc&type=recovery')).toBe(true);
  });

  it('does not treat an OAuth or sign-up callback as recovery', () => {
    expect(isRecoveryRedirect('plasticatch://auth/callback?code=abc')).toBe(false);
    expect(isRecoveryRedirect('plasticatch://auth/callback?code=abc&type=signup')).toBe(false);
    expect(isRecoveryRedirect('plasticatch://auth/callback')).toBe(false);
  });
});

describe('isRecoveryRedirectType', () => {
  it('accepts the redirect type the client reports for a recovery exchange', () => {
    expect(isRecoveryRedirectType('recovery')).toBe(true);
  });

  it('ignores a missing or non-recovery redirect type', () => {
    expect(isRecoveryRedirectType(null)).toBe(false);
    expect(isRecoveryRedirectType(undefined)).toBe(false);
    expect(isRecoveryRedirectType('signup')).toBe(false);
  });
});
