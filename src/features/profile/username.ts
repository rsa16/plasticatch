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

/** The wait the server enforces after a successful rename. */
export const USERNAME_COOLDOWN_DAYS = 14;
export const USERNAME_COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Milliseconds left before another rename is allowed, or `0` when there is no active cooldown.
 *
 * `username_changed_at` is written only by a successful change, so a fresh account with no
 * rename can edit immediately. An unreadable timestamp is treated as no cooldown: the server is
 * still the authority and will answer `username_cooldown` with the real retry time.
 */
export function usernameCooldownRemaining(
  changedAt: string | null,
  now: number = Date.now(),
): number {
  if (!changedAt) return 0;

  const changed = new Date(changedAt).getTime();
  if (Number.isNaN(changed)) return 0;

  // A rename can land while a screen that renders this stays mounted. A clock sampled before
  // the change must never report more than the full window, so cap at 14 days.
  const remaining = Math.min(changed + USERNAME_COOLDOWN_MS - now, USERNAME_COOLDOWN_MS);
  return remaining > 0 ? remaining : 0;
}

/** A coarse remaining wait, in the largest unit that keeps the countdown readable. */
export function formatCooldownRemaining(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));

  if (minutes >= 24 * 60) {
    const days = Math.ceil(minutes / (24 * 60));
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  if (minutes >= 60) {
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** The countdown shown while the rename control is disabled, or `null` once it is allowed. */
export function usernameCooldownLabel(
  changedAt: string | null,
  now: number = Date.now(),
): string | null {
  const remaining = usernameCooldownRemaining(changedAt, now);
  if (remaining === 0) return null;

  return `You can change your username again in ${formatCooldownRemaining(remaining)}.`;
}

/** The compact row value: the remaining wait, or "Change now" once allowed. */
export function usernameCooldownSummary(
  changedAt: string | null,
  now: number = Date.now(),
): string {
  const remaining = usernameCooldownRemaining(changedAt, now);
  if (remaining === 0) return 'Change now';

  return `Available in ${formatCooldownRemaining(remaining)}`;
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
