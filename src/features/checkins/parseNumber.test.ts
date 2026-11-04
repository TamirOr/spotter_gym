import { parsePositiveNumber } from './parseNumber';

describe('parsePositiveNumber', () => {
  it('reads whole and decimal numbers', () => {
    expect(parsePositiveNumber('45')).toBe(45);
    expect(parsePositiveNumber(' 5.2 ')).toBe(5.2);
    expect(parsePositiveNumber('5,2')).toBe(5.2);
  });

  it('treats empty, zero and junk as not given', () => {
    expect(parsePositiveNumber('')).toBeNull();
    expect(parsePositiveNumber('0')).toBeNull();
    expect(parsePositiveNumber('-3')).toBeNull();
    expect(parsePositiveNumber('abc')).toBeNull();
  });
});
