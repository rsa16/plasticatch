import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import type { Rejection } from '@/features/verification/rejection';
import type { VerifyCatchResult } from '@/features/verification/types';

import {
  assignCatchId,
  disposeCatch,
  EMPTY_CATCH_STATE,
  failSubmission,
  findCatch,
  retryCatch,
  settleRejected,
  settleVerified,
  type CatchCapture,
  type CatchState,
  type CompleteResult,
} from './lifecycle';

/** The lifecycle state plus the commands that drive it. */
export type CatchStore = CatchState & {
  /** Record the Find photo and move to Dispose. */
  found: (capture: CatchCapture) => void;
  /** Record the Dispose photo and move to Verifying. */
  disposed: (capture: CatchCapture) => void;
  /** Ensure the catch has the id its storage paths and row will use. */
  ensureCatchId: () => string;
  /** Freeze a verified catch and make it the completion. */
  verified: (result: VerifyCatchResult) => CompleteResult;
  /** Freeze a rejected catch with its copy and retry half. */
  rejected: (rejection: Rejection) => CompleteResult;
  /** Keep the catch but show a retryable submission failure. */
  failed: (message: string) => void;
  /** Start the half the rejection asked for. */
  retry: (half: 'find' | 'dispose') => void;
  /** Drop the active catch. Only called when the Catch flow is dismissed. */
  reset: () => void;
};

/** The catch in progress. Module-scoped so it survives route remounts inside the Catch modal. */
export const useCatchStore = create<CatchStore>()((set, get) => ({
  ...EMPTY_CATCH_STATE,

  found: (capture) => set((state) => findCatch(state, capture)),

  disposed: (capture) => set((state) => disposeCatch(state, capture)),

  ensureCatchId: () => {
    const current = get().catchId;
    if (current) return current;

    const catchId = randomUUID();
    set((state) => assignCatchId(state, catchId));
    return catchId;
  },

  verified: (result) => {
    const { state, result: outcome } = settleVerified(get(), result);
    if (outcome.status === 'completed') set(state);
    return outcome;
  },

  rejected: (rejection) => {
    const { state, result } = settleRejected(get(), rejection);
    set(state);
    return result;
  },

  failed: (message) => set((state) => failSubmission(state, message)),

  retry: (half) => set((state) => retryCatch(state, half)),

  // Clear a dismissed catch without replacing the store's command functions. Every optional
  // field must be named: Zustand merges, so spreading the empty state alone would leave them.
  reset: () =>
    set({
      step: 'find',
      catchId: undefined,
      find: undefined,
      dispose: undefined,
      completion: undefined,
      rejection: undefined,
      failure: undefined,
    }),
}));
