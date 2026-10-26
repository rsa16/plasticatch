import { outcomeFromRedirect, parseRedirectParams } from '@/features/auth/oauth';

describe('parseRedirectParams', () => {
  it('reads the PKCE code from the query string', () => {
    expect(parseRedirectParams('plasticatch://auth/callback?code=abc123')).toStrictEqual({
      code: 'abc123',
      error: null,
      errorDescription: null,
    });
  });

  it('reads params from the fragment too', () => {
    expect(parseRedirectParams('plasticatch://auth/callback#code=xyz')).toStrictEqual({
      code: 'xyz',
      error: null,
      errorDescription: null,
    });
  });

  it('decodes escaped values', () => {
    const params = parseRedirectParams(
      'plasticatch://auth/callback?error=access_denied&error_description=User%20cancelled%20the%20request',
    );

    expect(params.error).toBe('access_denied');
    expect(params.errorDescription).toBe('User cancelled the request');
  });

  it('returns empty params for a URL without a query', () => {
    expect(parseRedirectParams('plasticatch://auth/callback')).toStrictEqual({
      code: null,
      error: null,
      errorDescription: null,
    });
  });
});

describe('outcomeFromRedirect', () => {
  it('accepts a redirect carrying a code', () => {
    expect(outcomeFromRedirect('plasticatch://auth/callback?code=abc')).toStrictEqual({
      status: 'success',
    });
  });

  it('surfaces a provider error', () => {
    expect(
      outcomeFromRedirect(
        'plasticatch://auth/callback?error=access_denied&error_description=Denied',
      ),
    ).toStrictEqual({ status: 'error', message: 'Denied' });
  });

  it('rejects a redirect without a code', () => {
    expect(outcomeFromRedirect('plasticatch://auth/callback').status).toBe('error');
  });

  it('rejects a missing redirect', () => {
    expect(outcomeFromRedirect(null).status).toBe('error');
  });
});
