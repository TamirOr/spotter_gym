import { t } from 'i18next';

import { initI18n, setLanguage } from '.';

describe('i18n', () => {
  beforeAll(() => initI18n());

  it('uses Hebrew dual plurals', async () => {
    await setLanguage('he');
    expect(t('todayBar.done.cheers', { count: 1 })).toBe('עידוד אחד מהקליקה');
    expect(t('todayBar.done.cheers', { count: 2 })).toBe('שני עידודים מהקליקה');
    expect(t('todayBar.done.cheers', { count: 5 })).toBe('5 עידודים מהקליקה');
  });

  it('switches to English', async () => {
    await setLanguage('en');
    expect(t('todayBar.done.cheers', { count: 2 })).toBe('2 cheers from your clique');
    expect(t('goal.sessions.week', { count: 1, activity: 'Gym' })).toBe('Gym once a week');
  });
});
