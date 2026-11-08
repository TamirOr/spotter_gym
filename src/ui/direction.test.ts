import { appDirection } from './direction';

describe('appDirection', () => {
  it('lays the app out right to left in Hebrew', () => {
    expect(appDirection('he')).toEqual({ dir: 'rtl' });
  });

  it('lays the app out left to right in English', () => {
    expect(appDirection('en')).toEqual({ dir: 'ltr' });
  });
});
