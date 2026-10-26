/**
 * One catch in progress and the state machine that owns it.
 *
 * The lifecycle is pure: every command takes the current state and returns the next state. The
 * Zustand adapter in `store.ts` holds the active catch, and screens only read state or send
 * commands. Invalid transitions return the state untouched, so they cannot create a record or
 * award XP.
 */

/** Which step of the Catch flow the active catch is on. */
export type CatchStep = 'find' | 'dispose' | 'complete';

/** A finished catch, produced once by `completeCatch`. */
export type CatchCompletion = {
  findPhoto: string;
  disposePhoto: string;
  xp: number;
};

/** Everything the Catch flow knows about the catch in progress. */
export type CatchState = {
  step: CatchStep;
  findPhoto?: string;
  disposePhoto?: string;
  xp: number;
  completion?: CatchCompletion;
};

/** The state before the player has photographed anything. */
export const EMPTY_CATCH_STATE: CatchState = { step: 'find', xp: 0 };

/** XP for each verified step. Two steps make the 200 XP the Catch Complete screen shows. */
export const STEP_XP = 100;

/**
 * Chance that a photo passes the mock verifier, used when `EXPO_PUBLIC_CATCH_VERIFIER` isn't
 * `claude`: every photo is judged by a coin flip, so half of all attempts fail.
 */
export const CATCH_SUCCESS_RATE = 0.5;

/**
 * Whether a photo counts as a verified catch step. `random` is injectable so tests can pin the
 * outcome; it must return a number in [0, 1) like `Math.random`.
 */
export function verifyCatchPhoto(random: () => number = Math.random): boolean {
  return random() < CATCH_SUCCESS_RATE;
}

/** The outcome of asking the lifecycle to finish a catch. */
export type CompleteResult =
  | { status: 'completed'; completion: CatchCompletion }
  | { status: 'already-completed'; completion: CatchCompletion }
  | { status: 'rejected' };

/**
 * Record the Find photo. A retake replaces the photo without awarding the step's XP twice.
 * A completed catch is immutable.
 */
export function findCatch(state: CatchState, photo: string): CatchState {
  if (state.step === 'complete') return state;

  return {
    ...state,
    step: 'dispose',
    findPhoto: photo,
    xp: state.findPhoto ? state.xp : state.xp + STEP_XP,
  };
}

/**
 * Record the Dispose photo. Dispose is only earned after a Find photo; otherwise the state is
 * returned untouched. A retake replaces the photo without awarding the step's XP twice.
 */
export function disposeCatch(state: CatchState, photo: string): CatchState {
  if (!state.findPhoto || state.step === 'complete') return state;

  return {
    ...state,
    disposePhoto: photo,
    xp: state.disposePhoto ? state.xp : state.xp + STEP_XP,
  };
}

/**
 * Finish the catch. Completion requires both photos, awards no extra XP, and is idempotent:
 * repeating it returns the same completion instead of creating another one.
 */
export function completeCatch(state: CatchState): {
  state: CatchState;
  result: CompleteResult;
} {
  if (state.completion) {
    return { state, result: { status: 'already-completed', completion: state.completion } };
  }

  if (!state.findPhoto || !state.disposePhoto) {
    return { state, result: { status: 'rejected' } };
  }

  const completion: CatchCompletion = {
    findPhoto: state.findPhoto,
    disposePhoto: state.disposePhoto,
    xp: state.xp,
  };

  return {
    state: { ...state, step: 'complete', completion },
    result: { status: 'completed', completion },
  };
}
