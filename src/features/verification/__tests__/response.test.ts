import { CatchSubmitError, parseVerifyCatchResult } from '@/features/verification/response';

describe('verify-catch response', () => {
  it('reads the verified verdict and the ledger breakdown', () => {
    const result = parseVerifyCatchResult({
      verdict: 'verified',
      rejection_code: null,
      xp_breakdown: {
        already_awarded: false,
        xp_awarded: 25,
        base_xp: 10,
        streak_bonus: 0,
        first_catch_of_day: 15,
        repeat_location_adjustment: 0,
        daily_cap_adjustment: 0,
        total_xp: 125,
        level: 2,
        current_streak: 3,
        longest_streak: 4,
      },
    });

    expect(result.verdict).toBe('verified');
    expect(result.xp).toMatchObject({ xp_awarded: 25, first_catch_of_day: 15, level: 2 });
    expect(result.xp?.current_streak).toBe(3);
  });

  it('reads a rejection reason and retry half', () => {
    const result = parseVerifyCatchResult({
      verdict: 'rejected',
      rejection_code: 'photo_check_failed',
      reason: 'that looks like a shoe.',
      retry: 'dispose',
      xp_breakdown: null,
    });

    expect(result).toMatchObject({
      verdict: 'rejected',
      rejectionCode: 'photo_check_failed',
      reason: 'that looks like a shoe.',
      retry: 'dispose',
      xp: null,
    });
  });

  it('does not invent a pass from a malformed answer', () => {
    expect(() => parseVerifyCatchResult({ verdict: 'maybe' })).toThrow(CatchSubmitError);
    expect(() => parseVerifyCatchResult(null)).toThrow('verification_invalid_response');
  });
});
