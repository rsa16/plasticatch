import { leaderboardQueryKey } from '@/features/leaderboard/query';

describe('leaderboardQueryKey', () => {
  it('changes when the viewer home state changes', () => {
    const california = leaderboardQueryKey('state', { id: 'user-1', homeState: 'CA' });
    const oregon = leaderboardQueryKey('state', { id: 'user-1', homeState: 'OR' });

    expect(california).not.toStrictEqual(oregon);
  });

  it('keeps separate entries per cohort and viewer', () => {
    const viewer = { id: 'user-1', homeState: 'CA' };

    expect(leaderboardQueryKey('state', viewer)).not.toStrictEqual(
      leaderboardQueryKey('global', viewer),
    );
    expect(leaderboardQueryKey('state', viewer)).not.toStrictEqual(
      leaderboardQueryKey('state', { id: 'user-2', homeState: 'CA' }),
    );
  });

  it('is stable for the same viewer and tolerates a missing profile', () => {
    expect(leaderboardQueryKey('state', { id: 'user-1', homeState: 'CA' })).toStrictEqual(
      leaderboardQueryKey('state', { id: 'user-1', homeState: 'CA' }),
    );
    expect(() => leaderboardQueryKey('state')).not.toThrow();
  });
});
