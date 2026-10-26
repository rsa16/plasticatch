import { useOnboardingDraftStore } from '@/features/onboarding/draft';
import { getSupabase } from '@/lib/supabase';

import { openAuthSession } from './oauth';
import { readProfile } from './profile';
import { createSessionStore, type SessionStore } from './session-store';

/** The app's single session store, wired to the real Supabase client and browser. */
export const useSessionStore = createSessionStore({
  getClient: getSupabase,
  openAuth: openAuthSession,
  readProfile,
  onSignedOut: () => useOnboardingDraftStore.getState().reset(),
});

export type { SessionStore };
