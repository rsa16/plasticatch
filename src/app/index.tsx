import { Redirect } from 'expo-router';

import { useSessionStore } from '@/features/auth';

/**
 * The app shell's entry gate.
 *
 * While the persisted session is being resolved nothing is rendered, so the age gate never
 * flashes for a signed-in player. Signed-out players start at the age gate; signed-in players
 * land on the map.
 */
export default function Index() {
  const status = useSessionStore((state) => state.status);

  if (status === 'loading') return null;

  return <Redirect href={status === 'signed-in' ? '/map' : '/date-of-birth'} />;
}
