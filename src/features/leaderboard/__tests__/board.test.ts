import { board } from '..';
import { fixtureSource } from '../fixture-source';

describe('leaderboard cohorts', () => {
  it('labels each cohort with its ranking metric', async () => {
    expect(board('state', await fixtureSource('state'))).toMatchObject({
      cohort: 'state',
      title: 'State',
      metricLabel: 'Current-period XP',
    });
    expect(board('global', await fixtureSource('global'))).toMatchObject({
      cohort: 'global',
      title: 'Global',
      metricLabel: 'All-time XP',
    });
  });

  it('keeps the viewer’s own rank outside the visible entries', async () => {
    for (const cohort of ['state', 'global'] as const) {
      const standings = board(cohort, await fixtureSource(cohort));

      expect(standings.ownRank).toEqual(expect.any(Number));
      expect(standings.entries.length).toBeGreaterThan(0);
      expect(standings.entries.some((entry) => entry.rank === standings.ownRank)).toBe(false);
    }
  });

  it('drops a visible row whose rank is the viewer’s own rank', () => {
    const standings = board('state', {
      entries: [
        { rank: 1, username: 'leader', xp: 90, avatar: null },
        { rank: 4, username: 'viewer', xp: 40, avatar: null },
        { rank: 5, username: 'next', xp: 35, avatar: null },
      ],
      ownRank: 4,
    });

    expect(standings.entries.map((entry) => entry.rank)).toEqual([1, 5]);
    expect(standings.ownRank).toBe(4);
  });

  it('renders an empty board without inventing a rank', () => {
    const standings = board('state', { entries: [], ownRank: null });

    expect(standings.entries).toHaveLength(0);
    expect(standings.ownRank).toBeNull();
  });
});
