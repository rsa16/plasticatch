import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth';

import { leaderboardSource } from './supabase-source';
import { EMPTY_STANDINGS, type BoardSource, type Cohort } from './types';

/** The viewer fields that change what the State board returns. */
export type LeaderboardViewer = {
  id?: string | null;
  homeState?: string | null;
};

/**
 * One cache entry per cohort and viewer.
 *
 * The State cohort is scoped by the viewer's `home_state` on the server, so the key must carry
 * it (and the user id) too: otherwise a Settings change keeps serving the old state's board.
 */
export const leaderboardQueryKey = (cohort: Cohort, viewer?: LeaderboardViewer) =>
  ['leaderboard', cohort, viewer?.id ?? null, viewer?.homeState ?? null] as const;

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
  const profile = useSessionStore((state) => state.profile);

  return useQuery({
    queryKey: leaderboardQueryKey(cohort, {
      id: profile?.id,
      homeState: profile?.homeState,
    }),
    queryFn: () => fetchStandings(source, cohort),
    enabled: status === 'signed-in',
    placeholderData: EMPTY_STANDINGS,
    staleTime: 30_000,
  });
}
