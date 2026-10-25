/**
 * One catch in progress: the litter photo (Find), the trash-can photo (Dispose), and the XP they
 * earned. Kept in memory while the Catch flow is open; closing the flow drops it.
 */
export type CatchSession = {
  findPhoto?: string;
  disposePhoto?: string;
  xp: number;
};

/** Every state transition the session accepts. */
export type CatchSessionAction =
  { type: 'found'; photo: string } | { type: 'disposed'; photo: string } | { type: 'reset' };

/** XP for each verified step. Two steps make the 200 XP the Catch Complete screen shows. */
export const STEP_XP = 100;

/**
 * Chance that a photo passes verification. A placeholder until real trash/plastic detection
 * exists: every photo is judged by a coin flip, so half of all attempts fail.
 */
export const CATCH_SUCCESS_RATE = 0.5;

/**
 * Whether a photo counts as a verified catch step. `random` is injectable so tests can pin the
 * outcome; it must return a number in [0, 1) like `Math.random`.
 */
export function verifyCatchPhoto(random: () => number = Math.random): boolean {
  return random() < CATCH_SUCCESS_RATE;
}

/** The session before the player has photographed anything. */
export const EMPTY_CATCH_SESSION: CatchSession = { xp: 0 };

/** Pure state transition; the React adapter in `session-provider.tsx` is the only caller. */
export function catchSessionReducer(
  session: CatchSession,
  action: CatchSessionAction,
): CatchSession {
  switch (action.type) {
    case 'found':
      // Retaking Find replaces the photo without awarding its XP twice.
      return {
        ...session,
        findPhoto: action.photo,
        xp: session.findPhoto ? session.xp : session.xp + STEP_XP,
      };
    case 'disposed':
      return {
        ...session,
        disposePhoto: action.photo,
        xp: session.disposePhoto ? session.xp : session.xp + STEP_XP,
      };
    case 'reset':
      return EMPTY_CATCH_SESSION;
  }
}
