import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { catchSessionReducer, EMPTY_CATCH_SESSION, type CatchSession } from './session';

/** What screens consume: the session plus the actions that change it. */
export type CatchSessionStore = CatchSession & {
  found: (photo: string) => void;
  disposed: (photo: string) => void;
  reset: () => void;
};

const CatchSessionContext = createContext<CatchSessionStore | null>(null);

/**
 * Holds one catch while the Catch flow is open. Mounted by the `catch` layout, so dismissing the
 * flow unmounts it and the next catch starts empty.
 */
export function CatchSessionProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(catchSessionReducer, EMPTY_CATCH_SESSION);

  const store = useMemo<CatchSessionStore>(
    () => ({
      ...session,
      found: (photo) => dispatch({ type: 'found', photo }),
      disposed: (photo) => dispatch({ type: 'disposed', photo }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [session],
  );

  return <CatchSessionContext.Provider value={store}>{children}</CatchSessionContext.Provider>;
}

/** The catch in progress. Throws outside the provider, which only the `catch` layout mounts. */
export function useCatchSession(): CatchSessionStore {
  const store = useContext(CatchSessionContext);
  if (!store) {
    throw new Error('useCatchSession must be used inside CatchSessionProvider');
  }
  return store;
}
