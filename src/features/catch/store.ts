import { create } from 'zustand';

import {
  completeCatch,
  disposeCatch,
  EMPTY_CATCH_STATE,
  findCatch,
  type CatchCompletion,
  type CatchState,
  type CompleteResult,
} from './lifecycle';

/** The lifecycle state plus the commands that drive it. */
export type CatchStore = CatchState & {
  /** Record the Find photo and earn the step. */
  found: (photo: string) => void;
  /** Record the Dispose photo and earn the step; ignored before Find. */
  disposed: (photo: string) => void;
  /**
   * Finish the catch and hand the completion to `record` exactly once per catch. Repeat calls
   * return the existing completion and never call `record` again.
   */
  complete: (record?: (completion: CatchCompletion) => void) => CompleteResult;
  /** Drop the active catch. Only called when the Catch flow is dismissed. */
  reset: () => void;
};

/**
 * The catch in progress. Module-scoped so it survives route remounts inside the Catch modal
 * (including a remounted Complete screen); the Catch layout resets it when the modal closes.
 */
export const useCatchStore = create<CatchStore>()((set, get) => ({
  ...EMPTY_CATCH_STATE,

  found: (photo) => set((state) => findCatch(state, photo)),

  disposed: (photo) => set((state) => disposeCatch(state, photo)),

  complete: (record) => {
    const { state, result } = completeCatch(get());
    if (result.status === 'completed') {
      set(state);
      record?.(result.completion);
    }
    return result;
  },

  // Clear a dismissed catch without replacing the store's command functions.
  reset: () =>
    set({
      ...EMPTY_CATCH_STATE,
      findPhoto: undefined,
      disposePhoto: undefined,
      completion: undefined,
    }),
}));
