import { isUsStateCode } from '@/constants/us-states';

/**
 * Whether the home-state step may advance.
 *
 * Onboarding never infers a state from live GPS and never lets the step be skipped: Next stays
 * disabled until the player has explicitly picked a code the server accepts.
 */
export function canSubmitHomeState(code: string | null): code is string {
  return isUsStateCode(code);
}
