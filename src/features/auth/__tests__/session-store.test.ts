import type { Session } from '@supabase/supabase-js';

import { OAUTH_REDIRECT_URL } from '@/features/auth/oauth';
import { createSessionStore } from '@/features/auth/session-store';
import type { OAuthResult, Profile, SessionClient } from '@/features/auth/types';

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
        data: { session: fakeSession('user-1') },
        error: null,
      })),
      signOut: jest.fn(async () => ({ error: null })),
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
