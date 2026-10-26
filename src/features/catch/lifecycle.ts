/**
 * One catch in progress and the state machine that owns it.
 *
 * The lifecycle is pure: every command takes the current state and returns the next state. The
 * Zustand adapter in `store.ts` holds the active catch, and screens only read state or send
 * commands. Invalid transitions return the state untouched, so they cannot create a record or
 * award XP.
 */

import type { Rejection } from '@/features/verification/rejection';
import type { PreparedCapture, VerifyCatchResult } from '@/features/verification/types';

/** Which step of the Catch flow the active catch is on. */
export type CatchStep = 'find' | 'dispose' | 'verifying' | 'success' | 'reject';

/** A photo after the privacy pipeline, with the bytes retained for the upload. */
export type CatchCapture = PreparedCapture & { bytes: Uint8Array };

/** A finished, verified catch. Produced once by `settleVerified`. */
export type CatchCompletion = {
  catchId: string;
  findPhoto: string;
  disposePhoto: string;
  result: VerifyCatchResult;
};

/** Everything the Catch flow knows about the catch in progress. */
export type CatchState = {
  step: CatchStep;
  catchId?: string;
  find?: CatchCapture;
  dispose?: CatchCapture;
  completion?: CatchCompletion;
  rejection?: Rejection;
  /** A retryable failure while submitting; the catch is preserved. */
  failure?: string;
};

/** The state before the player has photographed anything. */
export const EMPTY_CATCH_STATE: CatchState = { step: 'find' };

/** The outcome of asking the lifecycle to finish a catch. */
export type CompleteResult =
  | { status: 'completed'; completion: CatchCompletion }
  | { status: 'already-completed'; completion: CatchCompletion }
  | { status: 'rejected'; rejection: Rejection }
  | { status: 'not-ready' };

/**
 * Record the Find photo. A retake replaces the photo without changing the step. A catch that has
 * already been settled is immutable.
 */
export function findCatch(state: CatchState, capture: CatchCapture): CatchState {
  if (state.completion || state.rejection) return state;

  return {
    ...state,
    step: 'dispose',
    find: capture,
    dispose: undefined,
    failure: undefined,
  };
}

/**
 * Record the Dispose photo and move to verification. Dispose is only accepted after a Find photo,
 * and a settled catch is immutable.
 */
export function disposeCatch(state: CatchState, capture: CatchCapture): CatchState {
  if (!state.find || state.completion || state.rejection) return state;

  return {
    ...state,
    step: 'verifying',
    dispose: capture,
    failure: undefined,
  };
}

/** Attach the catch id before the first submission. Repeating it keeps the same id. */
export function assignCatchId(state: CatchState, catchId: string): CatchState {
  return state.catchId ? state : { ...state, catchId };
}

/** The server verified the catch: freeze it and keep the ledger answer. */
export function settleVerified(
  state: CatchState,
  result: VerifyCatchResult,
): { state: CatchState; result: CompleteResult } {
  if (state.completion) {
    return { state, result: { status: 'already-completed', completion: state.completion } };
  }
  if (!state.catchId || !state.find || !state.dispose || result.verdict !== 'verified') {
    return { state, result: { status: 'not-ready' } };
  }

  const completion: CatchCompletion = {
    catchId: state.catchId,
    findPhoto: state.find.uri,
    disposePhoto: state.dispose.uri,
    result,
  };

  return {
    state: { ...state, step: 'success', completion, rejection: undefined, failure: undefined },
    result: { status: 'completed', completion },
  };
}

/** The server rejected the catch: no XP, no My Catches record, and a retry half. */
export function settleRejected(
  state: CatchState,
  rejection: Rejection,
): { state: CatchState; result: CompleteResult } {
  return {
    state: { ...state, step: 'reject', rejection, failure: undefined },
    result: { status: 'rejected', rejection },
  };
}

/** A network/server failure. The same catch can be submitted again. */
export function failSubmission(state: CatchState, failure: string): CatchState {
  return { ...state, failure };
}

/**
 * Start the half the rejection asks for. A Find retry drops both photos and starts over; a
 * Dispose retry keeps the Find capture but drops the rejected Dispose photo and the catch id, so
 * the next submission creates a fresh row instead of reusing a rejected one.
 */
export function retryCatch(state: CatchState, half: 'find' | 'dispose'): CatchState {
  if (state.step !== 'reject' && !state.failure) return state;

  if (half === 'find' || !state.find) {
    return {
      step: 'find',
      catchId: undefined,
      find: undefined,
      dispose: undefined,
      completion: undefined,
      rejection: undefined,
      failure: undefined,
    };
  }

  return {
    step: 'dispose',
    catchId: undefined,
    find: state.find,
    dispose: undefined,
    completion: undefined,
    rejection: undefined,
    failure: undefined,
  };
}
