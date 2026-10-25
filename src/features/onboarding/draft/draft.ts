/**
 * The answers a player gives during onboarding, kept in memory for this app session only.
 *
 * There is deliberately no persistence: reloading the page or relaunching the app starts the
 * draft over. Saving these answers belongs to the backlog identity ticket, which will write
 * them to the account rather than to local storage.
 */
export type OnboardingDraft = {
  dateOfBirth?: Date;
  username: string;
};

/** The draft before the player has answered anything. */
export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = { username: '' };

/**
 * Why a username cannot be used, or `null` when it can.
 *
 * Only the local blank check lives here. Reserved words, profanity, server availability and the
 * 14-day cooldown are backlog identity/settings work, so this function must stay synchronous and
 * offline.
 */
export function usernameProblem(username: string): string | null {
  return username.trim().length === 0 ? 'Enter a username.' : null;
}
