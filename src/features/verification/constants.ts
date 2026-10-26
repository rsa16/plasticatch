/**
 * The verification constants from spec §4.1 and ADR-0004.
 *
 * These are mirrored in `supabase/functions/verify-catch` (Edge Functions cannot import from
 * `src/`) and must stay identical. Changing one is a product decision, not a tuning knob.
 */

/** A GPS fix older than this disables the shutter. */
export const MAX_GPS_STALENESS_MS = 20_000;

/** A fix with a worse accuracy radius than this disables the shutter. */
export const MAX_GPS_ACCURACY_M = 30;

/** Find-to-dispose distance, in metres. Below 3 m the two shots are not a real carry. */
export const MIN_DISTANCE_M = 3;
export const MAX_DISTANCE_M = 500;

/** Find-to-dispose elapsed time, in seconds. */
export const MIN_ELAPSED_S = 15;
export const MAX_ELAPSED_S = 30 * 60;

/** Same-user like-for-like pHash Hamming threshold. */
export const PHASH_HAMMING_THRESHOLD = 8;

/** The trailing window for duplicate-photo matching. */
export const DUPLICATE_WINDOW_DAYS = 30;
