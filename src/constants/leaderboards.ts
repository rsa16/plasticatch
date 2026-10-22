// Placeholder standings from the Figma mock until a leaderboard API exists.

export type LeaderboardEntry = {
  rank: number;
  username: string;
  xp: number;
  /** The signed-in user's own row, which is highlighted. */
  isCurrentUser?: boolean;
};

export type Leaderboard = {
  title: string;
  entries: readonly LeaderboardEntry[];
};

const CURRENT_USER = 'yourusernamehere';

function others(ranks: readonly number[], xps: readonly number[]): LeaderboardEntry[] {
  return ranks.map((rank, i) => ({ rank, username: `user${rank}`, xp: xps[i] }));
}

export const LEADERBOARDS: readonly Leaderboard[] = [
  {
    title: 'Daily',
    entries: [
      ...others([1, 2, 3, 4, 5, 6, 7], [56, 48, 46, 40, 37, 36, 35]),
      { rank: 56, username: CURRENT_USER, xp: 4, isCurrentUser: true },
    ],
  },
  {
    title: 'Local',
    entries: [
      ...others([12, 13, 14, 15, 16, 17, 18], [456, 421, 412, 387, 350, 342, 315]),
      { rank: 56, username: CURRENT_USER, xp: 123, isCurrentUser: true },
    ],
  },
  {
    title: 'All Time',
    entries: [
      { rank: 124, username: CURRENT_USER, xp: 4646, isCurrentUser: true },
      ...others([455, 454, 453, 452, 451, 450, 449], [1003, 998, 965, 954, 933, 820, 819]),
    ],
  },
];
