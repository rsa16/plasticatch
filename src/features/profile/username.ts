/**
 * The username a Settings save should send, or `null` when there is nothing to save.
 *
 * "Nothing to save" covers an empty field and a value that matches the stored name under the
 * server's case-insensitive comparison. The server also treats an unchanged name as a no-op, but
 * skipping the call locally avoids burning the 14-day cooldown window on a no-op.
 */
export function usernameToSave(input: string, current: string | null): string | null {
  const candidate = input.trim().toLowerCase();
  if (!candidate) return null;

  const stored = current?.trim().toLowerCase() ?? '';
  if (candidate === stored) return null;

  return candidate;
}

/** A readable message for a username-cooldown rejection. */
export function cooldownMessage(retryAt: string | null): string {
  if (!retryAt) return 'You changed your username recently. Try again later.';

  const retry = new Date(retryAt);
  if (Number.isNaN(retry.getTime())) {
    return 'You changed your username recently. Try again later.';
  }

  return `You can change your username again on ${retry.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}.`;
}

/**
 * Why the Delete Account button cannot act yet.
 *
 * The backend requires a typed-username confirmation and a recent re-authentication. The screen
 * for that is not built, so the button must say so rather than delete anything.
 */
export const DELETE_ACCOUNT_UNAVAILABLE =
  'Account deletion needs the typed-username confirmation screen, which is not available yet. Nothing was deleted.';
