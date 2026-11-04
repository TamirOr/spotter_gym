import type { WeekEntry } from '../plan/api';

import { weekGrid } from './weekGrid';

const entry = (day: string, status: WeekEntry['status'], activity_id = 'gym'): WeekEntry => ({
  day,
  activity_id,
  time: null,
  plan_item_id: status === 'done' ? null : 'plan',
  checkin_id: status === 'done' ? 'checkin' : null,
  status,
});

describe('weekGrid', () => {
  const grid = weekGrid('2026-11-04', [
    entry('2026-11-01', 'done'),
    entry('2026-11-02', 'missed'),
    entry('2026-11-03', 'skipped'),
    entry('2026-11-04', 'planned'),
    entry('2026-11-06', 'planned', 'running'),
    entry('2026-11-06', 'done', 'boxing'),
  ]);

  it('has seven days from Sunday, with today marked', () => {
    expect(grid.map((cell) => cell.date)).toHaveLength(7);
    expect(grid[0].date).toBe('2026-11-01');
    expect(grid.find((cell) => cell.isToday)?.date).toBe('2026-11-04');
  });

  it('shows done and planned days', () => {
    expect(grid[0].mark).toBe('done');
    expect(grid[3]).toMatchObject({ mark: 'planned', planItemId: 'plan' });
  });

  it('never marks a missed or skipped day', () => {
    expect(grid[1].mark).toBe('none');
    expect(grid[2].mark).toBe('none');
  });

  it('prefers a done workout on a day with both', () => {
    expect(grid[5]).toMatchObject({ mark: 'done', activityId: 'boxing', planItemId: 'plan' });
  });
});
