import {
  requestCatchVerdict,
  VERIFY_PHOTO_FUNCTION,
  type VerifyPhotoInvoke,
} from '@/features/catch/verify-request';

function fakeInvoke(response: {
  data: unknown;
  error: { message: string; context?: { status?: number } } | null;
}) {
  return jest.fn(async (_body: unknown) => response) as jest.MockedFunction<VerifyPhotoInvoke>;
}

describe('requestCatchVerdict', () => {
  const request = { step: 'find' as const, photos: ['aGk='] };

  it('invokes the verify-photo Edge Function with the photos and returns the verdict', async () => {
    const verdict = { pass: true, item: 'plastic bottle', reason: 'A plastic bottle.' };
    const invoke = fakeInvoke({ data: verdict, error: null });

    await expect(requestCatchVerdict(request, invoke)).resolves.toStrictEqual(verdict);

    expect(invoke).toHaveBeenCalledWith(request);
    expect(VERIFY_PHOTO_FUNCTION).toBe('verify-photo');
  });

  it('throws when the function cannot be reached, so the step says "try again"', async () => {
    const invoke = fakeInvoke({
      data: null,
      error: { message: 'Failed to send a request to the Edge Function' },
    });

    await expect(requestCatchVerdict(request, invoke)).rejects.toThrow('photo_check_failed');
  });

  it('names the quota so a 429 is not mistaken for a transient failure', async () => {
    const invoke = fakeInvoke({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 429 } },
    });

    await expect(requestCatchVerdict(request, invoke)).rejects.toThrow(
      'photo_check_quota_exceeded',
    );
  });

  it('throws on an answer that is not a verdict', async () => {
    const invoke = fakeInvoke({ data: { ok: true }, error: null });

    await expect(requestCatchVerdict(request, invoke)).rejects.toThrow(
      'photo_check_invalid_response',
    );
  });
});
