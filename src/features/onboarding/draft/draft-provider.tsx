import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { EMPTY_ONBOARDING_DRAFT, onboardingDraftReducer, type OnboardingDraft } from './draft';

/** What screens consume: the draft plus the actions that change it. */
export type OnboardingDraftStore = OnboardingDraft & {
  setDateOfBirth: (dateOfBirth: Date) => void;
  setUsername: (username: string) => void;
  reset: () => void;
};

const OnboardingDraftContext = createContext<OnboardingDraftStore | null>(null);

/**
 * Holds the draft for the lifetime of the app session.
 *
 * Mounted once in the root layout, above both the onboarding group and the app shell, so the
 * answers are still there when Settings opens after the last step. The state is in memory only:
 * a reload or relaunch mounts a fresh provider and the draft starts over.
 */
export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, dispatch] = useReducer(onboardingDraftReducer, EMPTY_ONBOARDING_DRAFT);

  const store = useMemo<OnboardingDraftStore>(
    () => ({
      ...draft,
      setDateOfBirth: (dateOfBirth) => dispatch({ type: 'setDateOfBirth', dateOfBirth }),
      setUsername: (username) => dispatch({ type: 'setUsername', username }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [draft],
  );

  return (
    <OnboardingDraftContext.Provider value={store}>{children}</OnboardingDraftContext.Provider>
  );
}

/** The current onboarding draft. Throws outside the provider, which only the root layout mounts. */
export function useOnboardingDraft(): OnboardingDraftStore {
  const store = useContext(OnboardingDraftContext);
  if (!store) {
    throw new Error('useOnboardingDraft must be used inside OnboardingDraftProvider');
  }
  return store;
}
