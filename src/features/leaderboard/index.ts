import { board, COHORTS } from './board';
import { useLeaderboard } from './query';
import { leaderboardSource, standingsFromRows } from './supabase-source';

export type {
  Board,
  BoardSource,
  BoardStandings,
  Cohort,
  LeaderboardEntry,
  LeaderboardRow,
} from './types';
export { EMPTY_STANDINGS } from './types';
export { board, COHORTS, leaderboardSource, standingsFromRows, useLeaderboard };

/**
 * The screen's default source is live in every build. Fixtures are imported only by tests
 * (`./fixture-source`), so a release bundle cannot contain mock players or mock XP.
 */
export const defaultSource = leaderboardSource;
