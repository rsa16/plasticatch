import * as WebBrowser from 'expo-web-browser';

import type { OpenAuthSession, SignInOutcome } from './types';

/**
 * The app's OAuth return address.
 *
 * Matches `scheme` in app.json; the Supabase project must list it as an allowed
 * redirect URL (`plasticatch://auth/callback`).
 */
export const OAUTH_REDIRECT_URL = 'plasticatch://auth/callback';

/** The parameters carried by an OAuth redirect, whether in the query or the fragment. */
export type RedirectParams = {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
};

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/**
 * Pull `code`/`error` out of a redirect URL.
 *
 * Hand-rolled rather than using `URL`, because React Native's URL support is partial and the
 * PKCE redirect is a custom scheme (`plasticatch://auth/callback?code=…`). The query string
 * wins over the fragment, which is where an implicit-flow provider would put its tokens.
 */
export function parseRedirectParams(url: string): RedirectParams {
  const result: RedirectParams = { code: null, error: null, errorDescription: null };

  const queryStart = url.indexOf('?');
  const fragmentStart = url.indexOf('#');
  const segments = [
    queryStart >= 0 ? url.slice(queryStart + 1) : '',
    fragmentStart >= 0 ? url.slice(fragmentStart + 1) : '',
  ];

  for (const segment of segments) {
    // A fragment can itself contain a query once `?` is stripped above.
    const body = segment.split('#')[0];
    if (!body) continue;

    for (const pair of body.split('&')) {
      if (!pair) continue;
      const separator = pair.indexOf('=');
      const key = decode(separator >= 0 ? pair.slice(0, separator) : pair);
      const value = separator >= 0 ? decode(pair.slice(separator + 1)) : '';

      if (key === 'code' && !result.code) result.code = value || null;
      if (key === 'error' && !result.error) result.error = value || null;
      if (key === 'error_description' && !result.errorDescription) {
        result.errorDescription = value || null;
      }
    }
  }

  return result;
}

/** Open the provider page in an auth session and wait for the redirect. */
export const openAuthSession: OpenAuthSession = async (url, redirectUrl) => {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

  if (result.type === 'success') {
    return { type: 'success', url: result.url };
  }

  if (result.type === 'cancel') {
    return { type: 'cancel' };
  }

  if (result.type === 'dismiss') {
    return { type: 'dismiss' };
  }

  return { type: 'error', message: 'The sign-in window could not be opened.' };
};

/** Turn a redirect (or its absence) into the store's sign-in outcome. */
export function outcomeFromRedirect(url: string | null): SignInOutcome {
  if (!url) return { status: 'error', message: 'Sign-in did not return to the app.' };

  const params = parseRedirectParams(url);

  if (params.error) {
    return {
      status: 'error',
      message: params.errorDescription ?? params.error,
    };
  }

  if (!params.code) {
    return { status: 'error', message: 'Sign-in did not return an authorization code.' };
  }

  return { status: 'success' };
}
