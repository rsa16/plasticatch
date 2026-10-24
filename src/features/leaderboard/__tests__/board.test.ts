import { board, productionSource } from '..';
import { fixtureSource } from '../fixture-source';

describe('leaderboard cohorts', () => {
  it('labels each cohort with its ranking metric', () => {
    expect(board('state', fixtureSource)).toMatchObject({
      cohort: 'state',
      title: 'State',
      metricLabel: 'Current-period XP',
    });
    expect(board('global', fixtureSource)).toMatchObject({
      cohort: 'global',
      title: 'Global',
      metricLabel: 'All-time XP',
    });
  });

  it('keeps the viewer’s own rank outside the visible entries', () => {
    for (const cohort of ['state', 'global'] as const) {
      const standings = board(cohort, fixtureSource);

      expect(standings.ownRank).toEqual(expect.any(Number));
      expect(standings.entries.length).toBeGreaterThan(0);
      expect(standings.entries.some((entry) => entry.rank === standings.ownRank)).toBe(false);
    }
  });

  it('drops a visible row whose rank is the viewer’s own rank', () => {
    const standings = board('state', () => ({
      entries: [
        { rank: 1, username: 'leader', xp: 90 },
        { rank: 4, username: 'viewer', xp: 40 },
        { rank: 5, username: 'next', xp: 35 },
      ],
      ownRank: 4,
    }));

    expect(standings.entries.map((entry) => entry.rank)).toEqual([1, 5]);
    expect(standings.ownRank).toBe(4);
  });

  it('returns no entries or own rank from the production source', () => {
    for (const cohort of ['state', 'global'] as const) {
      const standings = board(cohort, productionSource);

      expect(standings.entries).toHaveLength(0);
      expect(standings.ownRank).toBeNull();
    }
  });
});
