import { addDays, localToday, minutesBetween, shortTime, weekDays, weekStart, weekdayOf } from './dates';

describe('dates', () => {
  it('starts weeks on Sunday', () => {
    expect(weekStart('2026-11-04')).toBe('2026-11-01');
    expect(weekStart('2026-11-01')).toBe('2026-11-01');
    expect(weekStart('2026-11-07')).toBe('2026-11-01');
  });

  it('lists the seven days of the week', () => {
    expect(weekDays('2026-11-04')).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('knows the weekday', () => {
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(weekdayOf('2026-11-07')).toBe(6);
  });

  it('formats the local date as ISO', () => {
    expect(localToday(new Date(2026, 10, 4, 23, 30))).toBe('2026-11-04');
  });

  it('shortens Postgres times', () => {
    expect(shortTime('18:00:00')).toBe('18:00');
  });

  it('counts whole minutes and never goes negative', () => {
    const now = new Date('2026-11-04T10:00:00Z');
    expect(minutesBetween('2026-11-04T09:47:30Z', now)).toBe(12);
    expect(minutesBetween('2026-11-04T10:05:00Z', now)).toBe(0);
  });
});
