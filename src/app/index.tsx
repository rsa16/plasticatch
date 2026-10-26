import { Redirect } from 'expo-router';

import { needsOnboarding, useSessionStore } from '@/features/auth';

/**
 * The app shell's entry gate.
 *
 * While the persisted session is being resolved nothing is rendered, so the age gate never
 * flashes for a signed-in player. A signed-out player starts at the age gate, which comes before
 * account creation. A signed-in player either finishes onboarding or lands on the map.
 */
export default function Index() {
  const status = useSessionStore((state) => state.status);
  const profile = useSessionStore((state) => state.profile);

  if (status === 'loading') return null;

  if (status === 'signed-in') {
    return <Redirect href={needsOnboarding(profile) ? '/profile' : '/map'} />;
  }

  return <Redirect href="/date-of-birth" />;
}
