import { LEADERBOARDS } from '../leaderboards';

describe('LEADERBOARDS', () => {
  it('exposes the three boards in display order', () => {
    expect(LEADERBOARDS.map((board) => board.title)).toEqual(['Daily', 'Local', 'All Time']);
  });

  it('highlights the signed-in player exactly once per board', () => {
    for (const board of LEADERBOARDS) {
      expect(board.entries.filter((entry) => entry.isCurrentUser)).toHaveLength(1);
    }
  });

  it('gives every entry a positive rank and non-negative xp', () => {
    for (const board of LEADERBOARDS) {
      for (const entry of board.entries) {
        expect(entry.rank).toBeGreaterThan(0);
        expect(entry.xp).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
