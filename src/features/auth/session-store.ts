import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { OAUTH_REDIRECT_URL, outcomeFromRedirect, parseRedirectParams } from './oauth';
import type {
  AuthStatus,
  OpenAuthSession,
  Profile,
  ReadProfile,
  SessionClient,
  SignInOutcome,
} from './types';

/** What the session store exposes to screens. */
export type SessionStore = {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  error: string | null;
  /** Resolve the persisted session once, then follow auth changes. */
  initialize: () => Promise<void>;
  /** Start Google OAuth and finish it when the provider redirects back. */
  signInWithGoogle: () => Promise<SignInOutcome>;
  /** Exchange a PKCE code from a redirect URL (used by the callback route). */
  completeOAuth: (url: string) => Promise<SignInOutcome>;
  /** End the session locally even when the network call fails. */
  signOut: () => Promise<void>;
  /** Re-read the profile row. */
  refreshProfile: () => Promise<void>;
  /** Re-read the stored session, e.g. after the app returns to the foreground. */
  refreshSession: () => Promise<void>;
};

export type SessionStoreDeps = {
  /** Resolved lazily so a missing configuration fails on use, not on import. */
  getClient: () => SessionClient;
  openAuth: OpenAuthSession;
  readProfile: ReadProfile;
  /** Called after a successful sign-out so per-player drafts cannot leak. */
  onSignedOut?: () => void;
};

function messageOf(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

/**
 * Build a session store around injected dependencies.
 *
 * The app passes the real Supabase client and browser session; tests pass fakes, so the
 * state machine is exercised without a network or a device.
 */
export function createSessionStore({
  getClient,
  openAuth,
  readProfile,
  onSignedOut,
}: SessionStoreDeps) {
  return create<SessionStore>()((set, get) => {
    let initialized = false;

    async function applySession(session: Session | null): Promise<void> {
      if (!session) {
        set({ status: 'signed-out', session: null, profile: null });
        return;
      }

      set({ status: 'signed-in', session, error: null });

      try {
        const profile = await readProfile(session.user.id);
        // A later auth event may already have moved on; only keep this profile if the
        // session it belongs to is still the current one.
        if (get().session?.user.id === session.user.id) {
          set({ profile });
        }
      } catch (error) {
        set({ error: messageOf(error, 'Could not load your profile.') });
      }
    }

    return {
      status: 'loading',
      session: null,
      profile: null,
      error: null,

      async initialize() {
        if (initialized) return;
        initialized = true;

        try {
          const { data, error } = await getClient().auth.getSession();

          if (error) {
            set({ status: 'signed-out', session: null, profile: null });
            return;
          }

          await applySession(data.session);

          getClient().auth.onAuthStateChange((_event, session) => {
            void applySession(session);
          });
        } catch (error) {
          // Missing configuration or an unreachable auth service. Settle so the entry gate can
          // route, and keep the reason so the sign-in attempt can show it.
          set({
            status: 'signed-out',
            session: null,
            profile: null,
            error: messageOf(error, 'Could not reach the sign-in service.'),
          });
        }
      },

      async signInWithGoogle() {
        set({ error: null });

        let url: string | null = null;
        let startError: unknown = null;

        try {
          const { data, error } = await getClient().auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: OAUTH_REDIRECT_URL, skipBrowserRedirect: true },
          });
          url = data.url;
          startError = error;
        } catch (error) {
          startError = error;
        }

        if (startError || !url) {
          const message = messageOf(startError, 'Could not start Google sign-in.');
          set({ error: message });
          return { status: 'error', message };
        }

        const result = await openAuth(url, OAUTH_REDIRECT_URL);

        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { status: 'cancelled' };
        }

        if (result.type === 'error') {
          const message = result.message ?? 'Google sign-in failed.';
          set({ error: message });
          return { status: 'error', message };
        }

        return get().completeOAuth(result.url);
      },

      async completeOAuth(url) {
        const outcome = outcomeFromRedirect(url);

        if (outcome.status !== 'success') {
          set({ error: outcome.status === 'error' ? outcome.message : null });
          return outcome;
        }

        const { code } = parseRedirectParams(url);

        if (!code) {
          const message = 'Sign-in did not return an authorization code.';
          set({ error: message });
          return { status: 'error', message };
        }

        const { data, error } = await getClient().auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          const message = messageOf(error, 'Could not complete sign-in.');
          set({ error: message });
          return { status: 'error', message };
        }

        await applySession(data.session);
        return { status: 'success' };
      },

      async signOut() {
        try {
          const { error } = await getClient().auth.signOut();
          // A network failure must not trap the player in the session.
          if (error) await getClient().auth.signOut({ scope: 'local' });
        } catch {
          await getClient()
            .auth.signOut({ scope: 'local' })
            .catch(() => undefined);
        }

        set({ status: 'signed-out', session: null, profile: null, error: null });
        onSignedOut?.();
      },

      async refreshProfile() {
        const session = get().session;
        if (!session) return;

        try {
          set({ profile: await readProfile(session.user.id) });
        } catch (error) {
          set({ error: messageOf(error, 'Could not load your profile.') });
        }
      },

      async refreshSession() {
        const { data } = await getClient().auth.getSession();
        await applySession(data.session);
      },
    };
  });
}
