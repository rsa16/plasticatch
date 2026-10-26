import { getSupabase } from '@/lib/supabase';

import { parseCatchVerdict, type CatchVerdict, type VerifyCatchRequest } from './verdict';

/**
 * The Edge Function that judges catch photos.
 *
 * The call is authenticated with the player's Supabase session, so the function can rate-limit by
 * player and the Anthropic key stays on the server. The app never holds the key and never talks to
 * Anthropic directly.
 */
export const VERIFY_PHOTO_FUNCTION = 'verify-photo';

/** What one `functions.invoke` call resolves to, narrowed to the parts this module reads. */
export type VerifyPhotoInvoke = (
  body: VerifyCatchRequest,
) => Promise<{ data: unknown; error: { message: string; context?: { status?: number } } | null }>;

const invokeVerifyPhoto: VerifyPhotoInvoke = async (body) => {
  const { data, error } = await getSupabase().functions.invoke(VERIFY_PHOTO_FUNCTION, {
    body,
    // The function itself gives the model 30s; a slightly longer client wait lets its
    // error reach the step instead of surfacing as a bare network timeout.
    timeout: 45_000,
  });
  return { data, error };
};

/**
 * Ask the Edge Function to judge a step's photos. Throws when the photos could not be checked at
 * all (no session, quota exhausted, server error, a malformed answer), which the step shows as
 * "try again" rather than as a failed catch. `invoke` is injectable so tests never touch the
 * network.
 */
export async function requestCatchVerdict(
  request: VerifyCatchRequest,
  invoke: VerifyPhotoInvoke = invokeVerifyPhoto,
): Promise<CatchVerdict> {
  const { data, error } = await invoke(request);

  if (error) {
    const status = error.context?.status;
    if (status === 429) throw new Error('photo_check_quota_exceeded');
    throw new Error(`photo_check_failed: ${error.message}`);
  }

  const verdict = parseCatchVerdict(data);
  if (!verdict) throw new Error('photo_check_invalid_response');
  return verdict;
}
