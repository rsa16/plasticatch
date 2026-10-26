/**
 * The rejection taxonomy from spec §4.3, plus the photo-check failure ticket 38 adds.
 *
 * The server owns the code; the client owns the copy and decides which half to retry. Keeping the
 * table here means a new server code cannot silently fall through to a generic message: unknown
 * codes use `FALLBACK_REJECTION`.
 */

export type RejectionCode =
  | 'mock_location'
  | 'gps_unreliable'
  | 'too_close'
  | 'too_far'
  | 'too_soon'
  | 'too_slow'
  | 'duplicate_photo'
  | 'reused_photo'
  | 'photo_check_failed';

/** Which photo a retry should replace. A Find retry starts the catch over, keeping the camera. */
export type RetryHalf = 'find' | 'dispose';

export type Rejection = {
  code: RejectionCode | 'unknown';
  message: string;
  retry: RetryHalf;
};

type RejectionCopy = Omit<Rejection, 'code'>;

const REJECTIONS: Record<RejectionCode, RejectionCopy> = {
  mock_location: {
    message: "We couldn't confirm a real location on this device.",
    retry: 'find',
  },
  gps_unreliable: {
    message: "We couldn't get a reliable GPS fix. Move to open sky and try again.",
    retry: 'find',
  },
  too_close: {
    message: 'Take the second photo a little further from where you found it.',
    retry: 'dispose',
  },
  too_far: {
    message: "That's too far from where you found the litter.",
    retry: 'dispose',
  },
  too_soon: {
    message: 'Wait a few seconds before the second photo.',
    retry: 'dispose',
  },
  too_slow: {
    message: 'That took too long. Please start the catch again.',
    retry: 'dispose',
  },
  duplicate_photo: {
    message: "That looks like a photo you've already used.",
    retry: 'find',
  },
  reused_photo: {
    message: "Your two photos are too similar. Take a fresh 'after' shot.",
    retry: 'dispose',
  },
  photo_check_failed: {
    // Replaced by the model's reason when the server returns one.
    message: "We couldn't confirm what's in your photos. Please try again.",
    retry: 'find',
  },
};

/** Used only when the server sends a code this build does not know. Never a silent pass. */
export const FALLBACK_REJECTION: Rejection = {
  code: 'unknown',
  message: "We couldn't verify this catch. Please try again.",
  retry: 'find',
};

/**
 * Map a server rejection code to the screen's copy. `reason` is the model's plain-language
 * explanation for `photo_check_failed`; it is never used to overwrite the deterministic messages.
 */
export function rejectionFor(
  code: string | null | undefined,
  reason?: string | null,
  retryOverride?: RetryHalf | null,
): Rejection {
  if (!code || !(code in REJECTIONS)) return FALLBACK_REJECTION;

  const known = REJECTIONS[code as RejectionCode];
  const message =
    code === 'photo_check_failed' && reason?.trim()
      ? `Catch failed: ${reason.trim()}`
      : known.message;

  return {
    code: code as RejectionCode,
    message,
    // Only the photo check can name the half that failed; the deterministic codes own theirs.
    retry: code === 'photo_check_failed' && retryOverride ? retryOverride : known.retry,
  };
}
