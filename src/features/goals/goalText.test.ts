import { t } from 'i18next';

import { initI18n, setLanguage } from '@/i18n';

import { goalFraction, goalTitle } from './goalText';

describe('goalTitle', () => {
  beforeAll(() => initI18n());

  it('describes session goals with Hebrew plurals', async () => {
    await setLanguage('he');
    expect(goalTitle(t, { metric: 'sessions', target: 4, period: 'week' }, 'חדר כושר', 'he-IL')).toBe(
      'חדר כושר 4 פעמים בשבוע',
    );
    expect(goalTitle(t, { metric: 'sessions', target: 2, period: 'week' }, 'אגרוף', 'he-IL')).toBe(
      'אגרוף פעמיים בשבוע',
    );
  });

  it('describes distance and step goals in English', async () => {
    await setLanguage('en');
    expect(goalTitle(t, { metric: 'distance_km', target: 5, period: 'day' }, 'Walking', 'en-IL')).toBe(
      'Walking: 5 km a day',
    );
    expect(goalTitle(t, { metric: 'steps', target: 8000, period: 'day' }, '', 'en-IL')).toBe('8,000 steps a day');
  });
});

describe('goalFraction', () => {
  it('caps at a full bar', () => {
    expect(goalFraction({ progress: 2, target: 4 })).toBe(0.5);
    expect(goalFraction({ progress: 6, target: 4 })).toBe(1);
  });
});
