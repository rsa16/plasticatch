import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth';

import { leaderboardSource } from './supabase-source';
import { EMPTY_STANDINGS, type BoardSource, type Cohort } from './types';

/** One cache entry per cohort; ranks refresh when the screen remounts or the app refocuses. */
export const leaderboardQueryKey = (cohort: Cohort) => ['leaderboard', cohort] as const;

/** The live standings for a cohort. Exposed for contract tests. */
export function fetchStandings(source: BoardSource, cohort: Cohort) {
  return source(cohort);
}

/**
 * The leaderboard's data hook.
 *
 * A signed-out or still-resolving session never calls the RPC: the board is empty and the screen
 * shows its normal empty state instead of an auth error.
 */
export function useLeaderboard(cohort: Cohort, source: BoardSource = leaderboardSource) {
  const status = useSessionStore((state) => state.status);

  return useQuery({
    queryKey: leaderboardQueryKey(cohort),
    queryFn: () => fetchStandings(source, cohort),
    enabled: status === 'signed-in',
    placeholderData: EMPTY_STANDINGS,
    staleTime: 30_000,
  });
}
