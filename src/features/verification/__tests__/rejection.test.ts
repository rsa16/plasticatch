import { FALLBACK_REJECTION, rejectionFor } from '@/features/verification/rejection';

describe('rejection taxonomy', () => {
  it.each([
    ['mock_location', 'find'],
    ['gps_unreliable', 'find'],
    ['too_close', 'dispose'],
    ['too_far', 'dispose'],
    ['too_soon', 'dispose'],
    ['too_slow', 'dispose'],
    ['duplicate_photo', 'find'],
    ['reused_photo', 'dispose'],
  ] as const)('maps %s to its retry half', (code, retry) => {
    const rejection = rejectionFor(code);
    expect(rejection.code).toBe(code);
    expect(rejection.retry).toBe(retry);
    expect(rejection.message.length).toBeGreaterThan(0);
  });

  it('uses the model reason for a photo-check failure and the server retry half', () => {
    const rejection = rejectionFor('photo_check_failed', 'that looks like a shoe.', 'dispose');

    expect(rejection.message).toBe('Catch failed: that looks like a shoe.');
    expect(rejection.retry).toBe('dispose');
  });

  it('falls back to Find when a photo-check failure has no retry half', () => {
    expect(rejectionFor('photo_check_failed', 'no bin visible.').retry).toBe('find');
  });

  it('never silently passes an unknown code', () => {
    expect(rejectionFor('something_new')).toStrictEqual(FALLBACK_REJECTION);
    expect(rejectionFor(null)).toStrictEqual(FALLBACK_REJECTION);
  });
});
