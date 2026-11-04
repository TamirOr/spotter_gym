import { t } from 'i18next';

import { initI18n, setLanguage } from '@/i18n';

import { describeRepeat, weekdayName } from './describeRepeat';

describe('describeRepeat', () => {
  beforeAll(async () => {
    initI18n();
    await setLanguage('en');
  });

  it('names weekly days in the app language', () => {
    expect(weekdayName('TH', 'en-IL')).toBe('Thu');
    expect(describeRepeat(t, { kind: 'weekly', days: ['SU', 'TH'], intervalWeeks: 1 }, '2026-11-01', 'en-IL')).toBe(
      'Every week: Sun, Thu',
    );
  });

  it('describes every second week and monthly rules', () => {
    expect(describeRepeat(t, { kind: 'weekly', days: ['TH'], intervalWeeks: 2 }, '2026-11-01', 'en-IL')).toBe(
      'Every 2 weeks: Thu',
    );
    expect(describeRepeat(t, { kind: 'monthly', day: 15 }, '2026-11-01', 'en-IL')).toBe('Day 15 of every month');
  });

  it('dates a one-off workout', () => {
    expect(describeRepeat(t, { kind: 'once' }, '2026-11-05', 'en-IL')).toBe('5 November');
  });
});
