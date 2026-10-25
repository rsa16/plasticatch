import { create } from 'zustand';

import { EMPTY_ONBOARDING_DRAFT, type OnboardingDraft } from './draft';

/** The draft answers plus the commands that change them. */
export type OnboardingDraftStore = OnboardingDraft & {
  setDateOfBirth: (dateOfBirth: Date) => void;
  setUsername: (username: string) => void;
  reset: () => void;
};

/**
 * The answers the player has given onboarding so far.
 *
 * Module-scoped so the date and username survive route remounts between onboarding steps and
 * are still there when Settings opens after onboarding. The state is in memory only: a reload
 * or relaunch starts a fresh module and the draft begins again. Sign-out and delete-account
 * confirmation call `reset` so one player's answers cannot leak into the next session.
 */
export const useOnboardingDraftStore = create<OnboardingDraftStore>()((set) => ({
  ...EMPTY_ONBOARDING_DRAFT,

  setDateOfBirth: (dateOfBirth) => set({ dateOfBirth }),

  setUsername: (username) => set({ username }),

  // Clear the optional date too; spreading the empty draft alone would leave it in place.
  reset: () => set({ ...EMPTY_ONBOARDING_DRAFT, dateOfBirth: undefined }),
}));
