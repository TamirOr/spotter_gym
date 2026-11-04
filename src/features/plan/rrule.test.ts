import { parseRRule, toRRule, weekdayOfDate, type Repeat } from './rrule';

describe('toRRule', () => {
  it('writes weekly rules with days in week order', () => {
    expect(toRRule({ kind: 'weekly', days: ['TH', 'SU', 'TU'], intervalWeeks: 1 })).toBe('FREQ=WEEKLY;BYDAY=SU,TU,TH');
  });

  it('writes every second Thursday', () => {
    expect(toRRule({ kind: 'weekly', days: ['TH'], intervalWeeks: 2 })).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=TH');
  });

  it('writes monthly and one-off workouts', () => {
    expect(toRRule({ kind: 'monthly', day: 15 })).toBe('FREQ=MONTHLY;BYMONTHDAY=15');
    expect(toRRule({ kind: 'once' })).toBeNull();
  });

  it('refuses a weekly rule without days', () => {
    expect(() => toRRule({ kind: 'weekly', days: [], intervalWeeks: 1 })).toThrow();
  });
});

describe('parseRRule', () => {
  it('reads back what toRRule writes', () => {
    const repeats: Repeat[] = [
      { kind: 'once' },
      { kind: 'weekly', days: ['SU', 'WE'], intervalWeeks: 1 },
      { kind: 'weekly', days: ['TH'], intervalWeeks: 2 },
      { kind: 'monthly', day: 31 },
    ];
    for (const repeat of repeats) {
      expect(parseRRule(toRRule(repeat))).toEqual(repeat);
    }
  });

  it('rejects rules the database would not accept', () => {
    expect(() => parseRRule('FREQ=DAILY')).toThrow();
  });
});

describe('weekdayOfDate', () => {
  it('maps dates to RRULE days', () => {
    expect(weekdayOfDate('2026-11-01')).toBe('SU');
    expect(weekdayOfDate('2026-11-05')).toBe('TH');
  });
});
