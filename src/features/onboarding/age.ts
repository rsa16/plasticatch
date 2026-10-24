import type { OnboardingDraft } from './draft';

/** The minimum age, in years, that the age gate admits. */
export const MIN_AGE = 13;

/**
 * Whether a self-declared date of birth clears the age gate on `today`.
 *
 * Pure: both dates are supplied by the caller and only their calendar fields are read, so the
 * time of day, the caller's clock and the host timezone cannot shift the birthday boundary.
 * A date of birth in the future is never admitted.
 */
export function admit(dob: Date, today: Date): boolean {
  const [bornYear, bornMonth, bornDay] = [dob.getFullYear(), dob.getMonth(), dob.getDate()];
  const [todayYear, todayMonth, todayDay] = [
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ];

  const isFuture =
    bornYear > todayYear ||
    (bornYear === todayYear &&
      (bornMonth > todayMonth || (bornMonth === todayMonth && bornDay > todayDay)));
  if (isFuture) return false;

  const years = todayYear - bornYear;
  if (years > MIN_AGE) return true;
  if (years < MIN_AGE) return false;

  // Same year difference as MIN_AGE: the birthday must already have happened this year.
  return bornMonth < todayMonth || (bornMonth === todayMonth && bornDay <= todayDay);
}

/**
 * Whether the onboarding steps after the date wheel are reachable for `draft` on `today`.
 *
 * This is the route guard's whole policy: an unanswered draft stops at the date wheel, and an
 * answered one reuses `admit` so there is only one age comparison in the app.
 */
export function canContinueOnboarding(draft: OnboardingDraft, today: Date): boolean {
  return draft.dateOfBirth !== undefined && admit(draft.dateOfBirth, today);
}
