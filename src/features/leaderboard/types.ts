/** The group a leaderboard ranks a player within. */
export type Cohort = 'state' | 'global';

/**
 * One ranked row on a board. The rank comes from the board source — the client never computes
 * it, because ranks are derived from the XP-event ledger (ADR-0003).
 */
export type LeaderboardEntry = {
  rank: number;
  username: string;
  xp: number;
};

/** What a board source supplies for one cohort. */
export type BoardStandings = {
  /**
   * Rows other than the viewer's own. A source must not put the viewer's row here: the screen
   * renders `ownRank` separately, and `board()` drops any entry that repeats that rank.
   */
  entries: readonly LeaderboardEntry[];
  /** The viewer's rank, kept outside `entries`; `null` when there is no ranking. */
  ownRank: number | null;
};

/** A source adapter: fixtures in development and tests, empty in production. */
export type BoardSource = (cohort: Cohort) => BoardStandings;

/** The leaderboard's public contract: cohort labels, visible rows, and the viewer's own rank. */
export type Board = {
  cohort: Cohort;
  title: string;
  metricLabel: string;
  entries: readonly LeaderboardEntry[];
  ownRank: number | null;
};
