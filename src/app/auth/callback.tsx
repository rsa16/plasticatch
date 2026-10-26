import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { OAUTH_REDIRECT_URL, useSessionStore } from '@/features/auth';

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * The OAuth return route (`plasticatch://auth/callback`).
 *
 * Expo Router has already split the deep link into params, so the PKCE code is reassembled
 * into the redirect URL the store understands, exchanged for a session, and then the player
 * is sent on. When the in-app browser session already finished the flow this route is not
 * reached; it exists for a cold start straight into the callback link.
 */
export default function AuthCallbackScreen() {
  const completeOAuth = useSessionStore((state) => state.completeOAuth);
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const query = [
      ['code', firstValue(params.code)],
      ['error', firstValue(params.error)],
      ['error_description', firstValue(params.error_description)],
    ]
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    void completeOAuth(`${OAUTH_REDIRECT_URL}${query ? `?${query}` : ''}`).then((outcome) => {
      // The entry gate decides between finishing onboarding and the map.
      router.replace(outcome.status === 'success' ? '/' : '/sign-in');
    });
  }, [completeOAuth, params.code, params.error, params.error_description]);

  return null;
}
