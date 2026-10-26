import { Redirect } from 'expo-router';

import { needsOnboarding, onboardingStartRoute, useSessionStore } from '@/features/auth';

/**
 * The app shell's entry gate.
 *
 * While the persisted session is being resolved nothing is rendered, so the age gate never
 * flashes for a signed-in player. A signed-out player starts at the age gate, which comes before
 * account creation. A signed-in player either finishes onboarding or lands on the map: a
 * profile missing its state resumes at the state step rather than the map.
 */
export default function Index() {
  const status = useSessionStore((state) => state.status);
  const profile = useSessionStore((state) => state.profile);
  const profileLoaded = useSessionStore((state) => state.profileLoaded);

  // Wait for the profile read, not just the session. Routing while `profile` is still null
  // would send a returning player back to onboarding's first step on every cold start.
  if (status === 'loading' || (status === 'signed-in' && !profileLoaded)) return null;

  if (status === 'signed-in') {
    return <Redirect href={needsOnboarding(profile) ? onboardingStartRoute(profile) : '/map'} />;
  }

  return <Redirect href="/date-of-birth" />;
}
