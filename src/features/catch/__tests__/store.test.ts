import { useCatchStore } from '@/features/catch';
import type { CatchCapture } from '@/features/catch/lifecycle';
import type { Rejection } from '@/features/verification/rejection';
import type { VerifyCatchResult } from '@/features/verification/types';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'catch-1'),
}));

function capture(uri: string): CatchCapture {
  return {
    uri,
    bytes: new Uint8Array([1]),
    pHash: '0123456789abcdef',
    lat: 37.7,
    lng: -122.4,
    accuracyM: 5,
    at: '2026-10-26T00:00:00.000Z',
    mock: false,
  };
}

const verifiedResult: VerifyCatchResult = {
  verdict: 'verified',
  rejectionCode: null,
  reason: null,
  retry: null,
  xp: {
    already_awarded: false,
    xp_awarded: 25,
    total_xp: 25,
    current_streak: 1,
    longest_streak: 1,
  },
  alreadyVerified: false,
};

const rejection: Rejection = { code: 'too_close', message: 'Too close.', retry: 'dispose' };

const store = () => useCatchStore.getState();

describe('catch store', () => {
  beforeEach(() => {
    store().reset();
  });

  it('keeps the same catch id across repeated submissions', () => {
    expect(store().ensureCatchId()).toBe('catch-1');
    expect(store().ensureCatchId()).toBe('catch-1');
    expect(store().catchId).toBe('catch-1');
  });

  it('walks Find then Dispose and settles a verified catch once', () => {
    store().found(capture('find.jpg'));
    store().disposed(capture('dispose.jpg'));
    expect(store().step).toBe('verifying');
    store().ensureCatchId();

    const first = store().verified(verifiedResult);
    const second = store().verified(verifiedResult);

    expect(first.status).toBe('completed');
    expect(second.status).toBe('already-completed');
    expect(store().step).toBe('success');
    expect(store().completion).toMatchObject({
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
    });
    expect(store().completion?.result.xp?.xp_awarded).toBe(25);
  });

  it('settles a rejection and retries the requested half', () => {
    store().found(capture('find.jpg'));
    store().disposed(capture('dispose.jpg'));

    expect(store().rejected(rejection).status).toBe('rejected');
    expect(store().step).toBe('reject');

    store().retry('dispose');

    expect(store().step).toBe('dispose');
    expect(store().find?.uri).toBe('find.jpg');
    expect(store().dispose).toBeUndefined();
  });

  it('keeps the catch and its id when submission fails', () => {
    store().found(capture('find.jpg'));
    store().disposed(capture('dispose.jpg'));
    store().ensureCatchId();
    store().failed('offline');

    expect(store().catchId).toBe('catch-1');
    expect(store().failure).toBe('offline');
    expect(store().find).toBeDefined();
    expect(store().dispose).toBeDefined();
  });

  it('resets every field and allows a new catch afterwards', () => {
    store().found(capture('find.jpg'));
    store().disposed(capture('dispose.jpg'));
    store().ensureCatchId();
    store().verified(verifiedResult);

    store().reset();

    expect(store().step).toBe('find');
    expect(store().find).toBeUndefined();
    expect(store().dispose).toBeUndefined();
    expect(store().completion).toBeUndefined();
    expect(store().catchId).toBeUndefined();
  });
});
