import type { WeekEntry } from '../plan/api';
import { dayContent, moveTargets } from './daySheet';

function entry(overrides: Partial<WeekEntry>): WeekEntry {
  return {
    day: '2026-11-10',
    planned_on: null,
    activity_id: 'gym',
    time: null,
    plan_item_id: null,
    checkin_id: null,
    status: 'done',
    ...overrides,
  };
}

describe('dayContent', () => {
  it('splits a day into logged and still-planned workouts', () => {
    const logged = entry({ checkin_id: 'c1' });
    const planned = entry({ status: 'planned', plan_item_id: 'p1', planned_on: '2026-11-10' });
    const content = dayContent(
      [
        logged,
        planned,
        entry({ status: 'skipped', plan_item_id: 'p2' }),
        entry({ day: '2026-11-11', checkin_id: 'c2' }),
      ],
      '2026-11-10',
    );
    expect(content.logged).toEqual([logged]);
    expect(content.planned).toEqual([planned]);
  });
});

describe('moveTargets', () => {
  // 2026-11-08 is a Sunday.
  it('offers the other days of the same week, from today on', () => {
    expect(moveTargets('2026-11-10', '2026-11-09')).toEqual([
      '2026-11-09',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
    ]);
  });

  it('offers nothing at the end of the week', () => {
    expect(moveTargets('2026-11-14', '2026-11-14')).toEqual([]);
  });
});
