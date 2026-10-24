import { board, fixtureSource, productionSource } from '..';

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

  it('returns no entries or own rank from the production source', () => {
    for (const cohort of ['state', 'global'] as const) {
      const standings = board(cohort, productionSource);

      expect(standings.entries).toHaveLength(0);
      expect(standings.ownRank).toBeNull();
    }
  });
});
