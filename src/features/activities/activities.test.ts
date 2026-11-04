import { activityLabel, countUsage, hasExactMatch, normalizeName, pickerOptions, type Activity } from './activities';

const gym: Activity = { id: 'gym', owner_id: null, name: 'Gym', name_he: 'חדר כושר', aliases: ['weights', 'lifting'] };
const boxing: Activity = { id: 'boxing', owner_id: null, name: 'Boxing', name_he: 'אגרוף', aliases: [] };
const padel: Activity = { id: 'padel', owner_id: 'me', name: 'Padel', name_he: null, aliases: [] };

describe('normalizeName', () => {
  it('matches the server rules', () => {
    expect(normalizeName('  GYM ')).toBe('gym');
    expect(normalizeName('gym   workout')).toBe('gym workout');
    expect(normalizeName('חֲדַר כּוֹשֶׁר')).toBe('חדר כושר');
    expect(normalizeName('שלום')).toBe('שלומ');
  });
});

describe('activityLabel', () => {
  it('uses the Hebrew name in Hebrew and the English name otherwise', () => {
    expect(activityLabel(gym, 'he')).toBe('חדר כושר');
    expect(activityLabel(gym, 'en')).toBe('Gym');
    expect(activityLabel(padel, 'he')).toBe('Padel');
  });
});

describe('pickerOptions', () => {
  const all = [padel, boxing, gym];

  it('puts the most-used first, then presets, then by name', () => {
    expect(pickerOptions(all, new Map(), '', 'en').map((a) => a.id)).toEqual(['boxing', 'gym', 'padel']);
    expect(pickerOptions(all, countUsage(['padel', 'padel', 'gym']), '', 'en').map((a) => a.id)).toEqual([
      'padel',
      'gym',
      'boxing',
    ]);
  });

  it('filters by name, Hebrew name and alias', () => {
    expect(pickerOptions(all, new Map(), 'lift', 'en').map((a) => a.id)).toEqual(['gym']);
    expect(pickerOptions(all, new Map(), 'אגרו', 'he').map((a) => a.id)).toEqual(['boxing']);
    expect(pickerOptions(all, new Map(), 'PAD', 'en').map((a) => a.id)).toEqual(['padel']);
  });
});

describe('hasExactMatch', () => {
  it('ignores case, spaces and language', () => {
    expect(hasExactMatch([gym], ' WEIGHTS ')).toBe(true);
    expect(hasExactMatch([gym], 'חדר כושר')).toBe(true);
    expect(hasExactMatch([gym], 'gy')).toBe(false);
  });
});
