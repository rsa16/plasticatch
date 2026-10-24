import type { BoardSource, LeaderboardEntry } from './types';

const STATE_ENTRIES: readonly LeaderboardEntry[] = [
  { rank: 1, username: 'user1', xp: 56 },
  { rank: 2, username: 'user2', xp: 48 },
  { rank: 3, username: 'user3', xp: 46 },
  { rank: 4, username: 'user4', xp: 40 },
  { rank: 5, username: 'user5', xp: 37 },
  { rank: 6, username: 'user6', xp: 36 },
  { rank: 7, username: 'user7', xp: 35 },
];

const GLOBAL_ENTRIES: readonly LeaderboardEntry[] = [
  { rank: 1, username: 'user455', xp: 1003 },
  { rank: 2, username: 'user454', xp: 998 },
  { rank: 3, username: 'user453', xp: 965 },
  { rank: 4, username: 'user452', xp: 954 },
  { rank: 5, username: 'user451', xp: 933 },
  { rank: 6, username: 'user450', xp: 820 },
  { rank: 7, username: 'user449', xp: 819 },
];

/**
 * Development and test standings, shaped like the Figma mock until the backlog leaderboard
 * RPC exists. The viewer's own rank is deliberately outside the visible rows so the screen has
 * to render it separately.
 *
 * Expo inlines `process.env.NODE_ENV` at build time, so a production bundle folds the data
 * branch away even though this module is statically imported.
 */
export const fixtureSource: BoardSource =
  process.env.NODE_ENV === 'production'
    ? () => ({ entries: [], ownRank: null })
    : (cohort) =>
        cohort === 'state'
          ? { entries: STATE_ENTRIES, ownRank: 56 }
          : { entries: GLOBAL_ENTRIES, ownRank: 124 };
