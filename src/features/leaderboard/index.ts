import { board, COHORTS } from './board';
import { fixtureSource } from './fixture-source';
import { productionSource } from './production-source';

export type { Board, BoardSource, BoardStandings, Cohort, LeaderboardEntry } from './types';
export { board, COHORTS, fixtureSource, productionSource };

/**
 * The screen consumes this, never the fixtures directly. `__DEV__` is a build-time constant, so
 * a production build selects the empty source and drops the fixture adapter.
 */
export const defaultSource = __DEV__ ? fixtureSource : productionSource;
