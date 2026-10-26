import {
  EMPTY_CATCH_STATE,
  assignCatchId,
  disposeCatch,
  failSubmission,
  findCatch,
  retryCatch,
  settleRejected,
  settleVerified,
  type CatchCapture,
} from '@/features/catch/lifecycle';
import type { Rejection } from '@/features/verification/rejection';
import type { VerifyCatchResult, XpBreakdown } from '@/features/verification/types';

function capture(uri: string): CatchCapture {
  return {
    uri,
    bytes: new Uint8Array([1, 2, 3]),
    pHash: '0123456789abcdef',
    lat: 37.7,
    lng: -122.4,
    accuracyM: 5,
    at: '2026-10-26T00:00:00.000Z',
    mock: false,
  };
}

function xp(overrides: Partial<XpBreakdown> = {}): XpBreakdown {
  return {
    already_awarded: false,
    xp_awarded: 25,
    base_xp: 10,
    streak_bonus: 0,
    first_catch_of_day: 15,
    repeat_location_adjustment: 0,
    daily_cap_adjustment: 0,
    total_xp: 125,
    level: 2,
    current_streak: 1,
    longest_streak: 1,
    ...overrides,
  };
}

function verified(overrides: Partial<VerifyCatchResult> = {}): VerifyCatchResult {
  return {
    verdict: 'verified',
    rejectionCode: null,
    reason: null,
    retry: null,
    xp: xp(),
    alreadyVerified: false,
    ...overrides,
  };
}

function rejected(retry: 'find' | 'dispose' = 'dispose'): Rejection {
  return { code: 'too_close', message: 'Too close.', retry };
}

function foundState(uri = 'find.jpg') {
  return findCatch(EMPTY_CATCH_STATE, capture(uri));
}

function disposedState(find = 'find.jpg', dispose = 'dispose.jpg') {
  return disposeCatch(foundState(find), capture(dispose));
}

describe('catch lifecycle', () => {
  it('starts at Find with no captures and no verdict', () => {
    expect(EMPTY_CATCH_STATE).toStrictEqual({ step: 'find' });
  });

  it('walks Find then Dispose into Verifying', () => {
    const found = foundState();
    expect(found.step).toBe('dispose');
    expect(found.find?.uri).toBe('find.jpg');

    const disposed = disposeCatch(found, capture('dispose.jpg'));
    expect(disposed.step).toBe('verifying');
    expect(disposed.dispose?.uri).toBe('dispose.jpg');
  });

  it('rejects Dispose before Find without changing state', () => {
    const next = disposeCatch(EMPTY_CATCH_STATE, capture('dispose.jpg'));
    expect(next).toBe(EMPTY_CATCH_STATE);
  });

  it('replaces a retaken Find photo and drops the old Dispose photo', () => {
    const first = foundState('one.jpg');
    const retaken = findCatch(first, capture('two.jpg'));

    expect(retaken.find?.uri).toBe('two.jpg');
    expect(retaken.dispose).toBeUndefined();
  });

  it('settles a verified catch and reuses the same completion on repeat', () => {
    const ready = assignCatchId(disposedState(), 'catch-1');
    const first = settleVerified(ready, verified());
    const second = settleVerified(first.state, verified());

    expect(first.result.status).toBe('completed');
    expect(first.state.step).toBe('success');
    expect(first.state.completion).toMatchObject({
      catchId: 'catch-1',
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
    });
    expect(second.result).toStrictEqual({
      status: 'already-completed',
      completion: first.result.status === 'completed' ? first.result.completion : undefined,
    });
    expect(second.state).toBe(first.state);
  });

  it('does not settle without a catch id or without both captures', () => {
    expect(settleVerified(disposedState(), verified()).result).toStrictEqual({
      status: 'not-ready',
    });
    expect(settleVerified(assignCatchId(foundState(), 'id'), verified()).result).toStrictEqual({
      status: 'not-ready',
    });
  });

  it('settles a rejection with its message and retry half', () => {
    const { state, result } = settleRejected(disposedState(), rejected('dispose'));

    expect(result).toStrictEqual({ status: 'rejected', rejection: rejected('dispose') });
    expect(state.step).toBe('reject');
    expect(state.rejection?.retry).toBe('dispose');
  });

  it('keeps the catch on a retryable submission failure', () => {
    const ready = assignCatchId(disposedState(), 'catch-1');
    const failed = failSubmission(ready, 'offline');

    expect(failed.step).toBe('verifying');
    expect(failed.failure).toBe('offline');
    expect(failed.catchId).toBe('catch-1');
    expect(failed.find).toBe(ready.find);
    expect(failed.dispose).toBe(ready.dispose);
  });

  it('retries only the rejected half and starts a new catch id for a Dispose retry', () => {
    const ready = assignCatchId(disposedState(), 'catch-1');
    const rejectedState = settleRejected(ready, rejected('dispose')).state;

    const disposeRetry = retryCatch(rejectedState, 'dispose');
    expect(disposeRetry.step).toBe('dispose');
    expect(disposeRetry.find?.uri).toBe('find.jpg');
    expect(disposeRetry.dispose).toBeUndefined();
    expect(disposeRetry.catchId).toBeUndefined();

    const findRetry = retryCatch(rejectedState, 'find');
    expect(findRetry.step).toBe('find');
    expect(findRetry.find).toBeUndefined();
    expect(findRetry.catchId).toBeUndefined();
  });

  it('rejects every transition after the catch is settled', () => {
    const ready = assignCatchId(disposedState(), 'catch-1');
    const settled = settleVerified(ready, verified()).state;

    expect(findCatch(settled, capture('another.jpg'))).toBe(settled);
    expect(disposeCatch(settled, capture('another.jpg'))).toBe(settled);
  });
});
