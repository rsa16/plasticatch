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
  /** The player's stored avatar; `null` renders the neutral head. */
  avatar: Record<string, string> | null;
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

/** An empty board, used before the live standings arrive and when there are none. */
export const EMPTY_STANDINGS: BoardStandings = { entries: [], ownRank: null };

/** A source adapter. The live one calls the `get_leaderboard` RPC; tests pass fakes. */
export type BoardSource = (cohort: Cohort) => Promise<BoardStandings>;

/** One row as the `get_leaderboard` RPC returns it. */
export type LeaderboardRow = {
  rank: number;
  user_id: string;
  username: string | null;
  avatar: unknown;
  home_state: string | null;
  score: number;
  total_xp: number;
  is_viewer: boolean;
};

/** The leaderboard's public contract: cohort labels, visible rows, and the viewer's own rank. */
export type Board = {
  cohort: Cohort;
  title: string;
  metricLabel: string;
  entries: readonly LeaderboardEntry[];
  ownRank: number | null;
};
