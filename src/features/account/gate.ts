/**
 * The client-side gate for permanent account deletion.
 *
 * The server independently enforces the same two conditions: a sign-in inside its 5-minute
 * `auth_time` window and a confirmation matching the stored username (or the literal `DELETE`
 * when the account has none). These checks only decide when the destructive control may be
 * used; they never replace the server's checks.
 */

/** Mirrors `MAX_AUTH_AGE_SECONDS` in the `delete-account` Edge Function. */
export const REAUTH_WINDOW_MS = 5 * 60 * 1000;

/** Allow a small device-clock skew, but never treat a future sign-in as arbitrarily fresh. */
const CLOCK_SKEW_MS = 30 * 1000;

/** How the player proves they are still the person who signed in. */
export type ReauthMethod = 'password' | 'google';

/** The session fields that decide the re-authentication method. */
export type AccountUser = {
  id: string;
  email?: string | null;
  app_metadata?: { provider?: string | null } | null;
  identities?: readonly { provider?: string | null }[] | null;
};

/**
 * Password for an email account, the provider flow for a Google account.
 *
 * `app_metadata.provider` is the credential the player actually signs in with, so it wins over
 * linked identities: an auto-linked email identity on a Google account may have no usable
 * password. Linked identities are the fallback when the metadata is absent.
 */
export function reauthMethodFor(user: AccountUser | null | undefined): ReauthMethod | null {
  if (!user) return null;

  const metadataProvider = user.app_metadata?.provider?.toLowerCase();
  if (metadataProvider === 'email') return 'password';
  if (metadataProvider === 'google') return 'google';

  const identityProviders = (user.identities ?? [])
    .map((identity) => identity.provider?.toLowerCase())
    .filter((provider): provider is string => Boolean(provider));

  if (identityProviders.includes('email')) return 'password';
  if (identityProviders.includes('google')) return 'google';

  return null;
}

/** The literal word the server accepts when the account has no username to type. */
export const USERNAME_LESS_CONFIRMATION = 'DELETE';

/**
 * Whether the typed confirmation proves intent.
 *
 * The server compares against the stored username, or the literal `DELETE` when the account has
 * none (for example an account created before a username was claimed). Surrounding whitespace is
 * ignored because the server trims it too.
 */
export function confirmationMatches(username: string | null | undefined, typed: string): boolean {
  const confirmation = typed.trim();
  if (!username) return confirmation === USERNAME_LESS_CONFIRMATION;
  return confirmation === username;
}

/** Whether a successful re-authentication is still inside the server's 5-minute window. */
export function isReauthFresh(
  reauthenticatedAt: number | null | undefined,
  now: number = Date.now(),
): boolean {
  if (typeof reauthenticatedAt !== 'number' || !Number.isFinite(reauthenticatedAt)) return false;

  const elapsed = now - reauthenticatedAt;
  return elapsed >= -CLOCK_SKEW_MS && elapsed < REAUTH_WINDOW_MS;
}

export type DeleteGate = {
  username: string | null | undefined;
  confirmation: string;
  reauthenticatedAt: number | null | undefined;
  now?: number;
};

/** The destructive action is enabled only when both independent checks pass. */
export function canDeleteAccount({
  username,
  confirmation,
  reauthenticatedAt,
  now = Date.now(),
}: DeleteGate): boolean {
  return confirmationMatches(username, confirmation) && isReauthFresh(reauthenticatedAt, now);
}
