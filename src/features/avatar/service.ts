import { getSupabase } from '@/lib/supabase';
import type { AvatarSelection } from '@/constants/avatar';
import {
  toProfileWriteResult,
  type ProfileWriteResult,
} from '@/features/onboarding/profile-service';

import { avatarStoredFrom } from './selection';

/** Persist the player's preset avatar through the profile write RPC. */
export async function saveAvatar(selection: AvatarSelection): Promise<ProfileWriteResult> {
  const { data, error } = await getSupabase().rpc('update_my_profile', {
    p_avatar: avatarStoredFrom(selection),
  });

  if (error) throw new Error(`avatar_update_failed: ${error.message}`);

  return toProfileWriteResult(data as Record<string, unknown> | null);
}

/** The message shown when the server rejects an avatar write. */
export function avatarErrorMessage(code: string | null): string | null {
  switch (code) {
    case 'invalid_avatar':
      return 'That avatar could not be saved. Pick a different combination.';
    case 'profile_not_found':
    case 'sign_in_required':
      return 'Sign in again to save your avatar.';
    case null:
      return null;
    default:
      return 'That avatar could not be saved. Try again.';
  }
}
