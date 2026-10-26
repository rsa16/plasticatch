import {
  MAX_PHOTO_BASE64_LENGTH,
  parseCatchVerdict,
  parseVerifyCatchRequest,
} from '@/features/catch/verdict';

describe('parseVerifyCatchRequest', () => {
  it('accepts one photo for Find and two for Dispose', () => {
    expect(parseVerifyCatchRequest({ step: 'find', photos: ['aGk='] })).toStrictEqual({
      ok: true,
      request: { step: 'find', photos: ['aGk='] },
    });
    expect(parseVerifyCatchRequest({ step: 'dispose', photos: ['aGk=', 'aGk='] }).ok).toBe(true);
  });

  it.each([
    ['a non-object body', 'nope'],
    ['an unknown step', { step: 'complete', photos: ['aGk='] }],
    ['the wrong photo count', { step: 'dispose', photos: ['aGk='] }],
    ['a non-string photo', { step: 'find', photos: [42] }],
    ['a photo that is not base64', { step: 'find', photos: ['file:///photo.jpg'] }],
    ['an oversized photo', { step: 'find', photos: ['a'.repeat(MAX_PHOTO_BASE64_LENGTH + 4)] }],
  ])('rejects %s', (_, body) => {
    expect(parseVerifyCatchRequest(body).ok).toBe(false);
  });
});

describe('parseCatchVerdict', () => {
  it('keeps a well-formed verdict', () => {
    const verdict = { pass: false, item: 'shoe', reason: 'that looks like a shoe, not litter.' };

    expect(parseCatchVerdict(verdict)).toStrictEqual(verdict);
  });

  it('drops extra fields', () => {
    expect(
      parseCatchVerdict({ pass: true, item: 'can', reason: 'A can.', extra: 1 }),
    ).toStrictEqual({ pass: true, item: 'can', reason: 'A can.' });
  });

  it.each([null, 'pass', { pass: 'yes', item: 'can', reason: '' }, { pass: true, item: 'can' }])(
    'rejects %p',
    (value) => {
      expect(parseCatchVerdict(value)).toBeNull();
    },
  );
});
