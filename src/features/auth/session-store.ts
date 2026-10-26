import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { OAUTH_REDIRECT_URL, outcomeFromRedirect, parseRedirectParams } from './oauth';
import {
  PASSWORD_UPDATE_ERROR,
  REAUTH_DIFFERENT_ACCOUNT,
  SIGN_IN_ERROR,
  SIGN_UP_ERROR,
  UNAVAILABLE_ERROR,
} from './messages';
import { isRecoveryRedirect, isRecoveryRedirectType } from './recovery';
import {
  forgetRecoveryRequest,
  hasRecoveryRequest,
  rememberRecoveryRequest,
} from './recovery-intent';
import type {
  AuthStatus,
  EmailActionOutcome,
  OpenAuthSession,
  PasswordAuthOutcome,
  Profile,
  ReadProfile,
  ReauthOutcome,
  SessionClient,
  SignInOutcome,
  UpdatePasswordOutcome,
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
  /** Create an email/password account; confirmation ON returns `confirmation_required`. */
  signUpWithPassword: (email: string, password: string) => Promise<PasswordAuthOutcome>;
  /** Log in with an existing email/password account. */
  signInWithPassword: (email: string, password: string) => Promise<PasswordAuthOutcome>;
  /** Send another confirmation email. Never reveals whether the address has an account. */
  resendConfirmation: (email: string) => Promise<EmailActionOutcome>;
  /** Start the password reset email flow. Never reveals whether the address has an account. */
  resetPassword: (email: string) => Promise<EmailActionOutcome>;
  /** True only for a session created by a password-recovery link. */
  recoverySession: boolean;
  /** Save a new password for the signed-in recovery session. */
  updatePassword: (password: string) => Promise<UpdatePasswordOutcome>;
  /** Prove the current player's identity with their password, keeping the same account. */
  reauthenticateWithPassword: (password: string) => Promise<ReauthOutcome>;
  /** Re-run the Google provider flow and require the same account to come back. */
  reauthenticateWithGoogle: () => Promise<ReauthOutcome>;
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

    function clearLocalSession(): void {
      set({ status: 'signed-out', session: null, profile: null, error: null });
      onSignedOut?.();
    }

    async function runGoogleFlow(): Promise<SignInOutcome> {
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
    }

    return {
      status: 'loading',
      session: null,
      profile: null,
      error: null,
      recoverySession: false,

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
        return runGoogleFlow();
      },

      async reauthenticateWithGoogle() {
        const expectedUserId = get().session?.user.id;

        if (!expectedUserId) {
          const message = 'Sign in again before deleting your account.';
          set({ error: message });
          return { status: 'error', message };
        }

        const outcome = await runGoogleFlow();

        if (outcome.status === 'cancelled') return { status: 'cancelled' };

        if (outcome.status === 'error') return { status: 'error', message: outcome.message };

        if (outcome.status !== 'success') {
          const message = 'Google did not finish signing you in. Try again.';
          set({ error: message });
          return { status: 'error', message };
        }

        // A provider sheet can sign in to a different account. Never let that account inherit
        // the deletion the player intended for the original one.
        if (get().session?.user.id !== expectedUserId) {
          try {
            await getClient().auth.signOut({ scope: 'local' });
          } catch {
            // Clearing local state is what matters; the stale network session expires anyway.
          }
          clearLocalSession();
          set({ error: REAUTH_DIFFERENT_ACCOUNT });
          return { status: 'error', message: REAUTH_DIFFERENT_ACCOUNT };
        }

        return { status: 'success' };
      },

      async signUpWithPassword(email, password) {
        set({ error: null });

        try {
          const { data, error } = await getClient().auth.signUp({
            email,
            password,
            // Confirmation links come back through the same PKCE callback route as OAuth.
            options: { emailRedirectTo: OAUTH_REDIRECT_URL },
          });

          if (error) {
            set({ error: SIGN_UP_ERROR });
            return { status: 'error', message: SIGN_UP_ERROR };
          }

          if (data.session) {
            await applySession(data.session);
            return { status: 'success' };
          }

          // Confirmation ON: no session until the emailed link is followed. Supabase answers
          // an existing address with a user that has no identities and still no session, so
          // "new" and "already registered" leave the store in exactly the same state.
          return { status: 'confirmation_required' };
        } catch {
          set({ error: UNAVAILABLE_ERROR });
          return { status: 'error', message: UNAVAILABLE_ERROR };
        }
      },

      async signInWithPassword(email, password) {
        set({ error: null });

        try {
          const { data, error } = await getClient().auth.signInWithPassword({ email, password });

          if (error || !data.session) {
            // A correct password on an unconfirmed account is the one failure worth naming.
            // It is only reachable with valid credentials, so it reveals nothing an attacker
            // did not already have; everything else collapses to the generic copy.
            if (error?.code === 'email_not_confirmed') {
              return { status: 'confirmation_required' };
            }

            set({ error: SIGN_IN_ERROR });
            return { status: 'error', message: SIGN_IN_ERROR };
          }

          await applySession(data.session);
          return { status: 'success' };
        } catch {
          set({ error: UNAVAILABLE_ERROR });
          return { status: 'error', message: UNAVAILABLE_ERROR };
        }
      },

      async resendConfirmation(email) {
        set({ error: null });

        try {
          // The provider's answer is deliberately ignored: "user not found", a rate limit and
          // a delivered email must look identical to the player. Only a missing client (no
          // request was made at all) is reported as a failure.
          await getClient().auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: OAUTH_REDIRECT_URL },
          });
        } catch {
          set({ error: UNAVAILABLE_ERROR });
          return { status: 'error', message: UNAVAILABLE_ERROR };
        }

        return { status: 'success' };
      },

      async resetPassword(email) {
        set({ error: null });

        try {
          // Same rule as the resend: an unknown address must not be distinguishable.
          await getClient().auth.resetPasswordForEmail(email, {
            redirectTo: OAUTH_REDIRECT_URL,
          });
        } catch {
          set({ error: UNAVAILABLE_ERROR });
          return { status: 'error', message: UNAVAILABLE_ERROR };
        }

        // Remember that a link may be on its way. An unknown address is indistinguishable here,
        // and without a real link this marker simply expires.
        await rememberRecoveryRequest();

        return { status: 'success' };
      },

      async updatePassword(password) {
        if (!get().recoverySession) {
          // A normal signed-in session must not be usable as a password-change backdoor.
          return { status: 'error', message: PASSWORD_UPDATE_ERROR };
        }

        set({ error: null });

        try {
          const { error } = await getClient().auth.updateUser({ password });

          if (error) {
            set({ error: PASSWORD_UPDATE_ERROR });
            return { status: 'error', message: PASSWORD_UPDATE_ERROR };
          }

          // A recovery session is one-shot. Revoke every other session and drop the flag so a
          // stolen session cannot keep access after the owner resets the password.
          await getClient()
            .auth.signOut({ scope: 'others' })
            .catch(() => undefined);
          set({ recoverySession: false });
          return { status: 'success' };
        } catch {
          set({ error: PASSWORD_UPDATE_ERROR });
          return { status: 'error', message: PASSWORD_UPDATE_ERROR };
        }
      },

      async reauthenticateWithPassword(password) {
        const current = get().session;
        const email = current?.user.email;

        if (!current || !email) {
          const message = 'Sign in again before deleting your account.';
          set({ error: message });
          return { status: 'error', message };
        }

        set({ error: null });

        try {
          const { data, error } = await getClient().auth.signInWithPassword({ email, password });

          if (error || !data.session) {
            set({ error: SIGN_IN_ERROR });
            return { status: 'error', message: SIGN_IN_ERROR };
          }

          // A re-authentication must land on the same account; otherwise the deletion would
          // target someone else.
          if (data.session.user.id !== current.user.id) {
            try {
              await getClient().auth.signOut({ scope: 'local' });
            } catch {
              // Local state is cleared below regardless.
            }
            clearLocalSession();
            set({ error: REAUTH_DIFFERENT_ACCOUNT });
            return { status: 'error', message: REAUTH_DIFFERENT_ACCOUNT };
          }

          await applySession(data.session);
          return { status: 'success' };
        } catch {
          set({ error: UNAVAILABLE_ERROR });
          return { status: 'error', message: UNAVAILABLE_ERROR };
        }
      },

      async completeOAuth(url) {
        const recoveryRedirect = isRecoveryRedirect(url);
        const outcome = outcomeFromRedirect(url);

        // A recovery link that expired or was already used never reaches the code exchange.
        // GoTrue's PKCE error redirect carries no `type`, so the reset marker is the only way
        // to tell it apart from a failed OAuth or sign-up link.
        if (outcome.status !== 'success') {
          if (recoveryRedirect || (await hasRecoveryRequest())) {
            await forgetRecoveryRequest();
            set({ error: null });
            return { status: 'recovery_expired' };
          }

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
        const recovery = recoveryRedirect || isRecoveryRedirectType(data.redirectType);

        if (error || !data.session) {
          if (recovery || (await hasRecoveryRequest())) {
            await forgetRecoveryRequest();
            set({ error: null });
            return { status: 'recovery_expired' };
          }

          const message = messageOf(error, 'Could not complete sign-in.');
          set({ error: message });
          return { status: 'error', message };
        }

        await applySession(data.session);
        // Any completed callback settles the reset request, so a stale marker cannot mislabel a
        // later failure.
        await forgetRecoveryRequest();

        if (recovery) {
          set({ recoverySession: true });
          return { status: 'recovery' };
        }

        set({ recoverySession: false });
        return { status: 'success' };
      },

      async signOut() {
        set({ recoverySession: false });
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
