import { getSupabase } from '@/lib/supabase';

/** Cache key for the owner-scoped verified-catch count shown in Settings. */
export const VERIFIED_CATCHES_QUERY_KEY = ['profile', 'verified-catches'] as const;

/** The one server read the count needs; injectable so tests never touch Supabase. */
export type CatchCountRead = () => Promise<{
  count: number | null;
  error: { message: string } | null;
}>;

/**
 * Count the signed-in player's verified catches.
 *
 * This is a server read, not a local tally: PostgREST runs `count(*)` under the owner-only
 * `catches_select_own` policy, so the response can only include the caller's rows. `gallery-feed`
 * returns the same verified rows for My Catches, but its page cap would undercount once a player
 * passes it, so the count uses the table directly.
 */
export const readVerifiedCatchCount: CatchCountRead = async () => {
  const { count, error } = await getSupabase()
    .from('catches')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'verified');

  return { count, error };
};

/** Resolve the verified-catch count, treating a missing count as zero. */
export async function countVerifiedCatches(
  read: CatchCountRead = readVerifiedCatchCount,
): Promise<number> {
  const { count, error } = await read();

  if (error) {
    throw new Error(`catch_count_failed: ${error.message}`);
  }

  return count ?? 0;
}
