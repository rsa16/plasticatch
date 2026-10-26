import { requestCatchVerdict, VERIFY_CATCH_PATH } from '@/features/catch/verify-request';

function fakeFetch(status: number, body: unknown) {
  return jest.fn(
    async (..._args: Parameters<typeof fetch>) =>
      ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response,
  );
}

describe('requestCatchVerdict', () => {
  const request = { step: 'find' as const, photos: ['aGk='] };

  it('posts the photos and returns the verdict', async () => {
    const verdict = { pass: true, item: 'plastic bottle', reason: 'A plastic bottle.' };
    const fetchFn = fakeFetch(200, verdict);

    await expect(requestCatchVerdict(request, fetchFn)).resolves.toStrictEqual(verdict);

    const [path, init] = fetchFn.mock.calls[0];
    expect(path).toBe(VERIFY_CATCH_PATH);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toStrictEqual(request);
  });

  it('throws on a server error so the step says "try again"', async () => {
    await expect(
      requestCatchVerdict(request, fakeFetch(502, { error: 'Could not check the photo.' })),
    ).rejects.toThrow('502');
  });

  it('throws on an answer that is not a verdict', async () => {
    await expect(requestCatchVerdict(request, fakeFetch(200, { ok: true }))).rejects.toThrow();
  });

  it('lets network failures through as errors', async () => {
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });

    await expect(requestCatchVerdict(request, fetchFn)).rejects.toThrow('Network request failed');
  });
});
