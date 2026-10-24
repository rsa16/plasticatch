import { board, COHORTS } from './board';
import { productionSource } from './production-source';

export type { Board, BoardSource, BoardStandings, Cohort, LeaderboardEntry } from './types';
export { board, COHORTS, productionSource };

/**
 * The screen consumes this, never the fixtures directly. `__DEV__` is a build-time constant, so
 * a production build folds this branch away and never instantiates the fixture adapter; a
 * conditional require keeps its mock players out of the production bundle as well.
 */
export const defaultSource = __DEV__
  ? // A static import would keep the fixtures in the production bundle even though the branch
    // is dead there, so load the adapter only for a development build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./fixture-source') as typeof import('./fixture-source')).fixtureSource
  : productionSource;
