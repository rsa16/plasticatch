import { standingsFromRows } from '@/features/leaderboard/supabase-source';
import type { LeaderboardRow } from '@/features/leaderboard/types';

function row(overrides: Partial<LeaderboardRow>): LeaderboardRow {
  return {
    rank: 1,
    user_id: 'user-1',
    username: 'alpha',
    avatar: null,
    home_state: 'CA',
    score: 100,
    total_xp: 900,
    is_viewer: false,
    ...overrides,
  };
}

describe('standingsFromRows', () => {
  it('keeps RPC ranks verbatim and never renumbers', () => {
    const standings = standingsFromRows([
      row({ rank: 1, username: 'alpha', score: 90 }),
      row({ rank: 2, username: 'bravo', score: 80 }),
      row({ rank: 7, username: 'charlie', score: 20 }),
    ]);

    expect(standings.entries).toStrictEqual([
      { rank: 1, username: 'alpha', xp: 90, avatar: null },
      { rank: 2, username: 'bravo', xp: 80, avatar: null },
      { rank: 7, username: 'charlie', xp: 20, avatar: null },
    ]);
    expect(standings.ownRank).toBeNull();
  });

  it('pulls the viewer row out of the list', () => {
    const standings = standingsFromRows([
      row({ rank: 1, username: 'alpha' }),
      row({ rank: 124, username: 'me', is_viewer: true }),
    ]);

    expect(standings.entries).toStrictEqual([
      { rank: 1, username: 'alpha', xp: 100, avatar: null },
    ]);
    expect(standings.ownRank).toBe(124);
  });

  it('maps the stored avatar onto the row and keeps null for a missing one', () => {
    const standings = standingsFromRows([
      row({ rank: 1, avatar: { hair: 'hair_3', skin: 'skin_2', shirt: 'shirt_4' } }),
      row({ rank: 2, avatar: 'not-json' }),
    ]);

    expect(standings.entries[0]?.avatar).toStrictEqual({
      hair: 'hair_3',
      skin: 'skin_2',
      shirt: 'shirt_4',
    });
    expect(standings.entries[1]?.avatar).toBeNull();
  });

  it('substitutes a placeholder for a null username', () => {
    const standings = standingsFromRows([row({ username: null })]);

    expect(standings.entries[0]?.username).toBe('Player');
  });

  it('is empty when the RPC returns nothing', () => {
    expect(standingsFromRows([])).toStrictEqual({ entries: [], ownRank: null });
  });
});
