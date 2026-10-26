import type { BoardSource, LeaderboardEntry } from './types';

const STATE_ENTRIES: readonly LeaderboardEntry[] = [
  { rank: 1, username: 'user1', xp: 56, avatar: null },
  { rank: 2, username: 'user2', xp: 48, avatar: null },
  { rank: 3, username: 'user3', xp: 46, avatar: null },
  { rank: 4, username: 'user4', xp: 40, avatar: null },
  { rank: 5, username: 'user5', xp: 37, avatar: null },
  { rank: 6, username: 'user6', xp: 36, avatar: null },
  { rank: 7, username: 'user7', xp: 35, avatar: null },
];

const GLOBAL_ENTRIES: readonly LeaderboardEntry[] = [
  { rank: 1, username: 'user455', xp: 1003, avatar: null },
  { rank: 2, username: 'user454', xp: 998, avatar: null },
  { rank: 3, username: 'user453', xp: 965, avatar: null },
  { rank: 4, username: 'user452', xp: 954, avatar: null },
  { rank: 5, username: 'user451', xp: 933, avatar: null },
  { rank: 6, username: 'user450', xp: 820, avatar: null },
  { rank: 7, username: 'user449', xp: 819, avatar: null },
];

/**
 * Development and test standings, shaped like the Figma mock until the backlog leaderboard
 * RPC exists. The viewer's own rank is deliberately outside the visible rows so the screen has
 * to render it separately.
 *
 * This module always returns its fixtures and is imported only by tests; no screen selects it.
 */
export const fixtureSource: BoardSource = async (cohort) =>
  cohort === 'state'
    ? { entries: STATE_ENTRIES, ownRank: 56 }
    : { entries: GLOBAL_ENTRIES, ownRank: 124 };
