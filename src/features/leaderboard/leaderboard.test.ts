import { formatPercent, standingOf, weekSegments, winners, type LeaderboardRow } from './leaderboard';

const row = (user_id: string, rank: number | null, score = 0): LeaderboardRow => ({
  user_id,
  full_name: user_id,
  avatar_url: null,
  planned: 4,
  completed: 0,
  score,
  rank,
});

describe('leaderboard', () => {
  it('formats scores as whole percentages', () => {
    expect(formatPercent(0.75, 'en-IL')).toBe('75%');
    expect(formatPercent(1, 'en-IL')).toBe('100%');
    expect(formatPercent(0.3333, 'en-IL')).toBe('33%');
  });

  it('finds my row', () => {
    expect(standingOf([row('noa', 1), row('me', 2)], 'me')?.rank).toBe(2);
    expect(standingOf([row('noa', 1)], 'me')).toBeUndefined();
  });

  it('lists every tied winner', () => {
    expect(winners([row('noa', 1), row('maya', 1), row('yoav', 3), row('eitan', null)]).map((r) => r.user_id)).toEqual([
      'noa',
      'maya',
    ]);
  });

  it('draws one segment per planned workout', () => {
    expect(weekSegments(4, 2)).toEqual([true, true, false, false]);
    expect(weekSegments(0, 0)).toEqual([]);
  });
});
