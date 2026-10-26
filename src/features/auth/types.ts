import type { Session } from '@supabase/supabase-js';

/** Where the app is in resolving who is signed in. */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

/** The player-owned fields the app reads from `profiles`. */
export type Profile = {
  id: string;
  username: string | null;
  avatar: Record<string, string> | null;
  homeState: string | null;
  ageVerifiedAt: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  privacyAcceptedAt: string | null;
  privacyVersion: string | null;
  /** Server-maintained rollups written by the XP ledger; the app never computes them. */
  totalXp: number;
  level: number;
  currentStreak: number;
  /** Set on a successful rename; Settings derives the 14-day username cooldown from it. */
  usernameChangedAt: string | null;
};

/** A `profiles` row as PostgREST returns it. */
export type ProfileRow = {
  id: string;
  username: string | null;
  avatar: unknown;
  home_state: string | null;
  age_verified_at: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_accepted_at: string | null;
  privacy_version: string | null;
  total_xp: number | null;
  level: number | null;
  current_streak: number | null;
  username_changed_at: string | null;
};

/** The columns the app selects from `profiles`. */
export const PROFILE_COLUMNS =
  'id,username,avatar,home_state,age_verified_at,terms_accepted_at,terms_version,privacy_accepted_at,privacy_version,total_xp,level,current_streak,username_changed_at';

/** A numeric rollup, treating a missing or non-finite value as zero. */
function countOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Keep only the string entries of a stored avatar object. */
export function avatarFromJson(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/** Map a `profiles` row onto the app's profile shape. */
export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatar: avatarFromJson(row.avatar),
    homeState: row.home_state?.trim() || null,
    ageVerifiedAt: row.age_verified_at,
    termsAcceptedAt: row.terms_accepted_at,
    termsVersion: row.terms_version,
    privacyAcceptedAt: row.privacy_accepted_at,
    privacyVersion: row.privacy_version,
    totalXp: countOrZero(row.total_xp),
    level: countOrZero(row.level),
    currentStreak: countOrZero(row.current_streak),
    usernameChangedAt: row.username_changed_at,
  };
}

/**
 * Whether the player still needs to be sent through onboarding.
 *
 * A profile is complete only once it has both a username and a home state; either one missing
 * (or no profile row at all) sends the player back into the onboarding stack.
 */
export function needsOnboarding(profile: Profile | null): boolean {
  return !profile || !profile.username || !profile.homeState;
}

/** The onboarding step to resume at; only meaningful when `needsOnboarding(profile)` is true. */
export function onboardingStartRoute(profile: Profile | null): '/profile' | '/home-state' {
  return profile?.username ? '/home-state' : '/profile';
}

/** A Supabase-shaped auth error, kept structural so fakes stay simple. */
export type AuthErrorLike = { message: string; code?: string | null } | null;

/** The subset of the Supabase client the session store uses. */
export type SessionClient = {
  auth: {
    getSession(): Promise<{
      data: { session: Session | null };
      error: AuthErrorLike;
    }>;
    onAuthStateChange(callback: (event: string, session: Session | null) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
    signInWithOAuth(args: {
      provider: 'google';
      options: { redirectTo: string; skipBrowserRedirect: boolean };
    }): Promise<{ data: { url: string | null }; error: AuthErrorLike }>;
    exchangeCodeForSession(code: string): Promise<{
      data: { session: Session | null; redirectType?: string | null };
      error: AuthErrorLike;
    }>;
    signOut(options?: { scope?: 'global' | 'local' }): Promise<{ error: AuthErrorLike }>;
    signUp(args: {
      email: string;
      password: string;
      options: { emailRedirectTo: string };
    }): Promise<{
      data: { session: Session | null; user: { identities?: unknown[] } | null };
      error: AuthErrorLike;
    }>;
    signInWithPassword(args: {
      email: string;
      password: string;
    }): Promise<{ data: { session: Session | null }; error: AuthErrorLike }>;
    resend(args: {
      type: 'signup';
      email: string;
      options: { emailRedirectTo: string };
    }): Promise<{ error: AuthErrorLike }>;
    resetPasswordForEmail(
      email: string,
      options: { redirectTo: string },
    ): Promise<{ error: AuthErrorLike }>;
    updateUser(attributes: { password: string }): Promise<{ error: AuthErrorLike }>;
  };
};

/** Reads the signed-in player's own profile row (RLS permits only their own). */
export type ReadProfile = (userId: string) => Promise<Profile | null>;

/** What an external browser auth session returned. */
export type OAuthResult =
  | { type: 'success'; url: string }
  | { type: 'cancel' }
  | { type: 'dismiss' }
  | { type: 'error'; message?: string };

/** Opens the provider page and waits for the redirect back into the app. */
export type OpenAuthSession = (url: string, redirectUrl: string) => Promise<OAuthResult>;

/** The outcome of starting (or finishing) the Google flow. */
export type SignInOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  /**
   * A recovery link was exchanged; the player must choose a new password before entering the
   * app. `recovery_expired` means the link was invalid, expired or already used.
   */
  | { status: 'recovery' }
  | { status: 'recovery_expired' };

/**
 * The outcome of creating an account or logging in with email and password.
 *
 * `confirmation_required` means the project has email confirmation ON and no session exists
 * yet: the same answer for a new address and an address that already has an account.
 */
export type PasswordAuthOutcome =
  | { status: 'success' }
  | { status: 'confirmation_required' }
  | { status: 'error'; message: string };

/** The outcome of an email that leaves the app (confirmation resend, password reset). */
export type EmailActionOutcome = { status: 'success' } | { status: 'error'; message: string };

/** The outcome of saving a new password from a recovery session. */
export type UpdatePasswordOutcome = { status: 'success' } | { status: 'error'; message: string };

/**
 * The outcome of proving the current player's identity again.
 *
 * Only `success` means the current session carries a fresh sign-in time; a cancelled provider
 * sheet or a different account leaves the destructive action closed.
 */
export type ReauthOutcome =
  { status: 'success' } | { status: 'cancelled' } | { status: 'error'; message: string };
