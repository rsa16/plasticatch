import { getSupabase } from '@/lib/supabase';

import {
  PROFILE_COLUMNS,
  mapProfileRow,
  type Profile,
  type ProfileRow,
  type ReadProfile,
} from './types';

/**
 * Read the signed-in player's own profile.
 *
 * `profiles` has an owner-only SELECT policy, so this can only ever return the caller's row.
 * A missing row is `null` (the player still needs onboarding); a transport error throws.
 */
export const readProfile: ReadProfile = async (userId): Promise<Profile | null> => {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`profile_read_failed: ${error.message}`);
  }

  return data ? mapProfileRow(data as unknown as ProfileRow) : null;
};
