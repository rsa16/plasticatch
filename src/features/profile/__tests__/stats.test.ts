import { countVerifiedCatches } from '@/features/profile';

describe('countVerifiedCatches', () => {
  it('returns the server count', async () => {
    await expect(countVerifiedCatches(async () => ({ count: 12, error: null }))).resolves.toBe(12);
  });

  it('treats a missing count as zero', async () => {
    await expect(countVerifiedCatches(async () => ({ count: null, error: null }))).resolves.toBe(0);
  });

  it('surfaces a failed read instead of guessing', async () => {
    await expect(
      countVerifiedCatches(async () => ({ count: null, error: { message: 'denied' } })),
    ).rejects.toThrow('catch_count_failed: denied');
  });
});
