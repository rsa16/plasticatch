import type { Session } from '@supabase/supabase-js';

import { OAUTH_REDIRECT_URL } from '@/features/auth/oauth';
import { createSessionStore } from '@/features/auth/session-store';
import {
  PASSWORD_UPDATE_ERROR,
  SIGN_IN_ERROR,
  SIGN_UP_ERROR,
  UNAVAILABLE_ERROR,
} from '@/features/auth/messages';
import {
  forgetRecoveryRequest,
  hasRecoveryRequest,
  rememberRecoveryRequest,
} from '@/features/auth/recovery-intent';
import type { OAuthResult, Profile, SessionClient } from '@/features/auth/types';

beforeEach(async () => {
  await forgetRecoveryRequest();
});

function fakeSession(userId: string): Session {
  return { user: { id: userId }, access_token: 'token' } as unknown as Session;
}

function fakeProfile(id: string): Profile {
  return {
    id,
    username: 'cryptic',
    avatar: null,
    homeState: 'CA',
    ageVerifiedAt: null,
    termsAcceptedAt: null,
    termsVersion: null,
    privacyAcceptedAt: null,
    privacyVersion: null,
    totalXp: 0,
    level: 0,
    currentStreak: 0,
    usernameChangedAt: null,
  };
}

function makeClient(overrides: Partial<Record<keyof SessionClient['auth'], unknown>> = {}) {
  const client = {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithOAuth: jest.fn(async () => ({
        data: { url: 'https://accounts.example/oauth' },
        error: null,
      })),
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session: fakeSession('user-1'), redirectType: null },
        error: null,
      })),
      signOut: jest.fn(async () => ({ error: null })),
      signUp: jest.fn(async () => ({
        data: { session: null, user: { identities: [{ id: 'identity-1' }] } },
        error: null,
      })),
      signInWithPassword: jest.fn(async () => ({
        data: { session: fakeSession('user-1') },
        error: null,
      })),
      resend: jest.fn(async () => ({ error: null })),
      resetPasswordForEmail: jest.fn(async () => ({ error: null })),
      updateUser: jest.fn(async () => ({ error: null })),
      ...overrides,
    },
  } as unknown as SessionClient;

  return client;
}

function makeStore(
  options: {
    client?: SessionClient;
    openAuth?: jest.Mock;
    readProfile?: jest.Mock;
    onSignedOut?: jest.Mock;
  } = {},
) {
  const client = options.client ?? makeClient();
  const openAuth: jest.Mock =
    options.openAuth ??
    jest.fn(async (): Promise<OAuthResult> => ({
      type: 'success',
      url: 'plasticatch://auth/callback?code=abc',
    }));
  const readProfile = options.readProfile ?? jest.fn(async (id: string) => fakeProfile(id));
  const onSignedOut = options.onSignedOut ?? jest.fn();

  const store = createSessionStore({
    getClient: () => client,
    openAuth,
    readProfile,
    onSignedOut,
  });

  return { store, client, openAuth, readProfile, onSignedOut };
}

describe('session store', () => {
  it('starts in loading and settles to signed-out with no session', async () => {
    const { store } = makeStore();

    expect(store.getState().status).toBe('loading');

    await store.getState().initialize();

    expect(store.getState().status).toBe('signed-out');
    expect(store.getState().profile).toBeNull();
  });

  it('settles to signed-in and loads the profile when a session exists', async () => {
    const client = makeClient({
      getSession: jest.fn(async () => ({ data: { session: fakeSession('user-1') }, error: null })),
    });
    const { store, readProfile } = makeStore({ client });

    await store.getState().initialize();

    expect(store.getState().status).toBe('signed-in');
    expect(store.getState().session?.user.id).toBe('user-1');
    expect(store.getState().profile?.id).toBe('user-1');
    expect(readProfile).toHaveBeenCalledWith('user-1');
  });

  it('follows later auth state changes', async () => {
    let emit: ((event: string, session: Session | null) => void) | undefined;

    const client = makeClient({
      onAuthStateChange: jest.fn((callback: (event: string, session: Session | null) => void) => {
        emit = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    });
    const { store } = makeStore({ client });

    await store.getState().initialize();
    expect(store.getState().status).toBe('signed-out');

    emit?.('SIGNED_IN', fakeSession('user-2'));
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().status).toBe('signed-in');
    expect(store.getState().profile?.id).toBe('user-2');
  });

  it('does not initialise twice', async () => {
    const { store, client } = makeStore();

    await store.getState().initialize();
    await store.getState().initialize();

    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it('completes Google sign-in by exchanging the returned code', async () => {
    const { store, client, openAuth } = makeStore();

    const outcome = await store.getState().signInWithGoogle();

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(openAuth).toHaveBeenCalledWith('https://accounts.example/oauth', OAUTH_REDIRECT_URL);
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(store.getState().status).toBe('signed-in');
  });

  it('treats a dismissed browser as cancelled and exchanges nothing', async () => {
    const { store, client } = makeStore({
      openAuth: jest.fn(async () => ({ type: 'cancel' })),
    });

    const outcome = await store.getState().signInWithGoogle();

    expect(outcome).toStrictEqual({ status: 'cancelled' });
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('surfaces a provider error from the redirect', async () => {
    const { store } = makeStore({
      openAuth: jest.fn(async () => ({
        type: 'success',
        url: 'plasticatch://auth/callback?error=access_denied&error_description=Denied',
      })),
    });

    const outcome = await store.getState().signInWithGoogle();

    expect(outcome).toStrictEqual({ status: 'error', message: 'Denied' });
    expect(store.getState().error).toBe('Denied');
  });

  it('reports a missing configuration instead of throwing', async () => {
    const store = createSessionStore({
      getClient: () => {
        throw new Error('Supabase is not configured.');
      },
      openAuth: jest.fn(),
      readProfile: jest.fn(),
    });

    await store.getState().initialize();
    expect(store.getState().status).toBe('signed-out');
    expect(store.getState().error).toContain('not configured');

    const outcome = await store.getState().signInWithGoogle();
    expect(outcome.status).toBe('error');
  });

  it('clears the session locally even when the network sign-out fails', async () => {
    const client = makeClient({
      getSession: jest.fn(async () => ({ data: { session: fakeSession('user-1') }, error: null })),
      signOut: jest.fn(async ({ scope }: { scope?: string } = {}) => {
        if (!scope) return { error: { message: 'network down' } };
        return { error: null };
      }),
    });
    const { store, onSignedOut } = makeStore({ client });

    await store.getState().initialize();
    await store.getState().signOut();

    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(store.getState().status).toBe('signed-out');
    expect(store.getState().session).toBeNull();
    expect(store.getState().profile).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
  });

  it('keeps the session signed-in when the profile read fails', async () => {
    const client = makeClient({
      getSession: jest.fn(async () => ({ data: { session: fakeSession('user-1') }, error: null })),
    });
    const { store } = makeStore({
      client,
      readProfile: jest.fn(async () => {
        throw new Error('profile_read_failed');
      }),
    });

    await store.getState().initialize();

    expect(store.getState().status).toBe('signed-in');
    expect(store.getState().error).toContain('profile_read_failed');
  });
});

describe('email/password session store', () => {
  it('signs up with confirmation required, without creating a session', async () => {
    const client = makeClient({
      signUp: jest.fn(async () => ({
        data: { session: null, user: { identities: [{ id: 'identity-1' }] } },
        error: null,
      })),
    });
    const { store, readProfile } = makeStore({ client });

    await store.getState().initialize();
    const outcome = await store.getState().signUpWithPassword('player@example.com', 'secret123');

    expect(outcome).toStrictEqual({ status: 'confirmation_required' });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'secret123',
      options: { emailRedirectTo: OAUTH_REDIRECT_URL },
    });
    expect(store.getState().status).toBe('signed-out');
    expect(store.getState().session).toBeNull();
    expect(readProfile).not.toHaveBeenCalled();
  });

  it('treats an already-registered sign-up exactly like a new one', async () => {
    // Supabase returns a user with no identities, and no session, for an address that already
    // exists. The store must not let that difference show through.
    const client = makeClient({
      signUp: jest.fn(async () => ({
        data: { session: null, user: { identities: [] } },
        error: null,
      })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().signUpWithPassword('taken@example.com', 'secret123');

    expect(outcome).toStrictEqual({ status: 'confirmation_required' });
    expect(store.getState().error).toBeNull();
  });

  it('signs up straight into a session when the project does not require confirmation', async () => {
    const client = makeClient({
      signUp: jest.fn(async () => ({
        data: { session: fakeSession('user-1'), user: { identities: [{ id: 'identity-1' }] } },
        error: null,
      })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().signUpWithPassword('player@example.com', 'secret123');

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(store.getState().status).toBe('signed-in');
    expect(store.getState().profile?.id).toBe('user-1');
  });

  it('maps a sign-up error to one generic message, never the provider text', async () => {
    const client = makeClient({
      signUp: jest.fn(async () => ({
        data: { session: null, user: null },
        error: { message: 'User already registered' },
      })),
    });
    const { store } = makeStore({ client });

    await store.getState().initialize();
    const outcome = await store.getState().signUpWithPassword('taken@example.com', 'secret123');

    expect(outcome).toStrictEqual({ status: 'error', message: SIGN_UP_ERROR });
    expect(SIGN_UP_ERROR).not.toContain('already');
    expect(store.getState().error).toBe(SIGN_UP_ERROR);
    expect(store.getState().status).toBe('signed-out');
  });

  it('logs in with a confirmed email and password', async () => {
    const { store, readProfile } = makeStore();

    const outcome = await store.getState().signInWithPassword('player@example.com', 'secret123');

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(store.getState().status).toBe('signed-in');
    expect(store.getState().session?.user.id).toBe('user-1');
    expect(readProfile).toHaveBeenCalledWith('user-1');
  });

  it('maps invalid credentials to the generic sign-in message', async () => {
    const client = makeClient({
      signInWithPassword: jest.fn(async () => ({
        data: { session: null },
        error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
      })),
    });
    const { store } = makeStore({ client });

    await store.getState().initialize();
    const outcome = await store.getState().signInWithPassword('player@example.com', 'wrong');

    expect(outcome).toStrictEqual({ status: 'error', message: SIGN_IN_ERROR });
    expect(SIGN_IN_ERROR).not.toContain('credentials');
    expect(store.getState().error).toBe(SIGN_IN_ERROR);
    expect(store.getState().status).toBe('signed-out');
  });

  it('sends an unconfirmed player back to the check-email state', async () => {
    const client = makeClient({
      signInWithPassword: jest.fn(async () => ({
        data: { session: null },
        error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
      })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().signInWithPassword('player@example.com', 'secret123');

    expect(outcome).toStrictEqual({ status: 'confirmation_required' });
    expect(store.getState().error).toBeNull();
  });

  it('reports a resend as successful even when the address is unknown', async () => {
    const client = makeClient({
      resend: jest.fn(async () => ({ error: { message: 'User not found' } })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().resendConfirmation('nobody@example.com');

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(store.getState().error).toBeNull();
    expect(client.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'nobody@example.com',
      options: { emailRedirectTo: OAUTH_REDIRECT_URL },
    });
  });

  it('reports the reset flow as sent even when the address is unknown', async () => {
    const client = makeClient({
      resetPasswordForEmail: jest.fn(async () => ({ error: { message: 'User not found' } })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().resetPassword('nobody@example.com');

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(store.getState().error).toBeNull();
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('nobody@example.com', {
      redirectTo: OAUTH_REDIRECT_URL,
    });
  });

  it('reports missing configuration as a plain message instead of throwing', async () => {
    const store = createSessionStore({
      getClient: () => {
        throw new Error('Supabase is not configured.');
      },
      openAuth: jest.fn(),
      readProfile: jest.fn(),
    });

    await expect(store.getState().signUpWithPassword('a@b.co', 'secret123')).resolves.toStrictEqual(
      { status: 'error', message: UNAVAILABLE_ERROR },
    );
    await expect(store.getState().signInWithPassword('a@b.co', 'secret123')).resolves.toStrictEqual(
      { status: 'error', message: UNAVAILABLE_ERROR },
    );
    await expect(store.getState().resendConfirmation('a@b.co')).resolves.toStrictEqual({
      status: 'error',
      message: UNAVAILABLE_ERROR,
    });
    await expect(store.getState().resetPassword('a@b.co')).resolves.toStrictEqual({
      status: 'error',
      message: UNAVAILABLE_ERROR,
    });
    await expect(store.getState().updatePassword('secret123')).resolves.toStrictEqual({
      status: 'error',
      message: PASSWORD_UPDATE_ERROR,
    });
  });
});

describe('password recovery', () => {
  it('routes a recovery exchange to the new-password flow', async () => {
    const client = makeClient({
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session: fakeSession('user-1'), redirectType: 'recovery' },
        error: null,
      })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().completeOAuth('plasticatch://auth/callback?code=abc');

    expect(outcome).toStrictEqual({ status: 'recovery' });
    expect(store.getState().status).toBe('signed-in');
    expect(store.getState().session?.user.id).toBe('user-1');
  });

  it('recognises a recovery redirect even when the exchange reports no type', async () => {
    const { store } = makeStore();

    const outcome = await store
      .getState()
      .completeOAuth('plasticatch://auth/callback?code=abc&type=recovery');

    expect(outcome).toStrictEqual({ status: 'recovery' });
    expect(store.getState().status).toBe('signed-in');
  });

  it('keeps a sign-up confirmation callback on the existing success route', async () => {
    const client = makeClient({
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session: fakeSession('user-1'), redirectType: 'signup' },
        error: null,
      })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().completeOAuth('plasticatch://auth/callback?code=abc');

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(store.getState().status).toBe('signed-in');
  });

  it('remembers the reset request until the callback handles it', async () => {
    const client = makeClient({
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session: fakeSession('user-1'), redirectType: 'recovery' },
        error: null,
      })),
    });
    const { store } = makeStore({ client });

    await store.getState().resetPassword('player@example.com');
    await expect(hasRecoveryRequest()).resolves.toBe(true);

    await store.getState().completeOAuth('plasticatch://auth/callback?code=abc');
    await expect(hasRecoveryRequest()).resolves.toBe(false);
  });

  it('shows the request-a-new-link state for an expired redirect carrying the marker', async () => {
    const { store } = makeStore();
    await store.getState().initialize();

    const outcome = await store
      .getState()
      .completeOAuth(
        'plasticatch://auth/callback?error=access_denied&error_code=otp_expired&type=recovery',
      );

    expect(outcome).toStrictEqual({ status: 'recovery_expired' });
    expect(store.getState().error).toBeNull();
    expect(store.getState().status).toBe('signed-out');
  });

  it('uses the pending reset request to classify an expired PKCE link', async () => {
    const client = makeClient({
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session: null, redirectType: null },
        error: { message: 'invalid flow state' },
      })),
    });
    const { store } = makeStore({ client });
    await store.getState().initialize();

    await rememberRecoveryRequest();
    const outcome = await store.getState().completeOAuth('plasticatch://auth/callback?code=abc');

    expect(outcome).toStrictEqual({ status: 'recovery_expired' });
    expect(store.getState().error).toBeNull();
    expect(store.getState().status).toBe('signed-out');
    await expect(hasRecoveryRequest()).resolves.toBe(false);
  });

  it('classifies an expired PKCE link that fails before the code exchange', async () => {
    const { store } = makeStore();

    await rememberRecoveryRequest();
    const outcome = await store
      .getState()
      .completeOAuth('plasticatch://auth/callback?error=access_denied&error_code=otp_expired');

    expect(outcome).toStrictEqual({ status: 'recovery_expired' });
    expect(store.getState().error).toBeNull();
  });

  it('keeps a failed callback on the generic sign-in error when no reset was requested', async () => {
    const client = makeClient({
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session: null, redirectType: null },
        error: { message: 'Could not complete sign-in.' },
      })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().completeOAuth('plasticatch://auth/callback?code=abc');

    expect(outcome).toStrictEqual({
      status: 'error',
      message: 'Could not complete sign-in.',
    });
    expect(store.getState().error).toBe('Could not complete sign-in.');
  });

  it('saves a new password through updateUser', async () => {
    const { store, client } = makeStore();

    const outcome = await store.getState().updatePassword('new-secret');

    expect(outcome).toStrictEqual({ status: 'success' });
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-secret' });
    expect(store.getState().error).toBeNull();
  });

  it('maps an update failure to one generic message, never the provider text', async () => {
    const client = makeClient({
      updateUser: jest.fn(async () => ({
        error: { message: 'Password should be at least 6 characters' },
      })),
    });
    const { store } = makeStore({ client });

    const outcome = await store.getState().updatePassword('short');

    expect(outcome).toStrictEqual({ status: 'error', message: PASSWORD_UPDATE_ERROR });
    expect(PASSWORD_UPDATE_ERROR).not.toContain('characters');
    expect(store.getState().error).toBe(PASSWORD_UPDATE_ERROR);
  });
});
