import { getSupabase } from '@/lib/supabase';
import { avatarFromJson } from '@/features/auth';

import type { BoardSource, BoardStandings, Cohort, LeaderboardRow } from './types';

/**
 * Map RPC rows onto the board contract.
 *
 * The RPC returns the viewer's own row marked with `is_viewer`. Ranks are taken verbatim: the
 * client must not re-sort, renumber or recompute them.
 */
export function standingsFromRows(rows: readonly LeaderboardRow[]): BoardStandings {
  const viewer = rows.find((row) => row.is_viewer) ?? null;

  const entries = rows
    .filter((row) => !row.is_viewer)
    .map((row) => ({
      rank: Number(row.rank),
      username: row.username ?? 'Player',
      xp: Number(row.score),
      avatar: avatarFromJson(row.avatar),
    }));

  return {
    entries,
    ownRank: viewer ? Number(viewer.rank) : null,
    ...(viewer ? { ownXp: Number(viewer.score) } : {}),
  };
}

/**
 * Live standings for one cohort.
 *
 * State uses the viewer's `home_state` because no state code is supplied. A missing profile
 * (`profile_not_found`) means the player has no home state yet, so the board is simply empty
 * rather than an error.
 */
export const leaderboardSource: BoardSource = async (cohort: Cohort): Promise<BoardStandings> => {
  const { data, error } = await getSupabase().rpc('get_leaderboard', {
    p_scope: cohort,
    p_state_code: null,
  });

  if (error) {
    if (error.message?.includes('profile_not_found')) {
      return { entries: [], ownRank: null };
    }
    throw new Error(`leaderboard_failed: ${error.message}`);
  }

  return standingsFromRows((data ?? []) as LeaderboardRow[]);
};
