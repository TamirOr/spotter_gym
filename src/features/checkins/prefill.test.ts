import { numberText, prefillField } from './prefill';

describe('prefillField', () => {
  it('offers the value last used while the field is untouched', () => {
    expect(prefillField('', false, 45)).toBe('45');
    expect(prefillField('45', false, 30)).toBe('30');
  });

  it('clears an offered value when the next activity has none', () => {
    expect(prefillField('45', false, null)).toBe('');
    expect(prefillField('45', false, undefined)).toBe('');
  });

  it('keeps what the user typed', () => {
    expect(prefillField('20', true, 45)).toBe('20');
    expect(prefillField('', true, 45)).toBe('');
  });
});

describe('numberText', () => {
  it('writes a stored number, or nothing', () => {
    expect(numberText(5.5)).toBe('5.5');
    expect(numberText(null)).toBe('');
  });
});
