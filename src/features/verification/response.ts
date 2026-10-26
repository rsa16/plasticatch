import type { RetryHalf } from './rejection';
import type { VerifyCatchResult, XpBreakdown } from './types';

/** A failure the Verifying screen can retry without losing the catch. */
export class CatchSubmitError extends Error {
  /** `true` when the same catch can be sent again; `false` when the flow must start over. */
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = 'CatchSubmitError';
    this.retryable = retryable;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseXp(value: unknown): XpBreakdown | null {
  if (!isRecord(value)) return null;
  if (typeof value.xp_awarded !== 'number' || typeof value.total_xp !== 'number') return null;

  const number = (key: string) =>
    typeof value[key] === 'number' ? (value[key] as number) : undefined;

  return {
    already_awarded: value.already_awarded === true,
    xp_awarded: value.xp_awarded,
    base_xp: number('base_xp'),
    streak_bonus: number('streak_bonus'),
    first_catch_of_day: number('first_catch_of_day'),
    repeat_location_adjustment: number('repeat_location_adjustment'),
    daily_cap_adjustment: number('daily_cap_adjustment'),
    total_xp: value.total_xp,
    level: number('level'),
    current_streak: number('current_streak') ?? 0,
    longest_streak: number('longest_streak') ?? 0,
  };
}

/** Parse the Edge Function's answer. A malformed answer is a retryable failure, never a pass. */
export function parseVerifyCatchResult(data: unknown): VerifyCatchResult {
  if (!isRecord(data) || (data.verdict !== 'verified' && data.verdict !== 'rejected')) {
    throw new CatchSubmitError('verification_invalid_response');
  }

  const retry =
    data.retry === 'find' || data.retry === 'dispose' ? (data.retry as RetryHalf) : null;

  return {
    verdict: data.verdict,
    rejectionCode: typeof data.rejection_code === 'string' ? data.rejection_code : null,
    reason: typeof data.reason === 'string' ? data.reason : null,
    retry,
    xp: parseXp(data.xp_breakdown),
    alreadyVerified: data.already_verified === true,
  };
}
