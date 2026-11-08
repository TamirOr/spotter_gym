import { cleanCode, isCompleteCode, looksLikeEmail } from './signInCode';

describe('sign-in code', () => {
  it('keeps only the six digits', () => {
    expect(cleanCode(' 123 456 ')).toBe('123456');
    expect(cleanCode('1234567')).toBe('123456');
    expect(cleanCode('12a3')).toBe('123');
  });

  it('is complete at six digits', () => {
    expect(isCompleteCode('123456')).toBe(true);
    expect(isCompleteCode('12345')).toBe(false);
  });

  it('checks the email lightly', () => {
    expect(looksLikeEmail(' noa@example.com ')).toBe(true);
    expect(looksLikeEmail('noa@example')).toBe(false);
    expect(looksLikeEmail('noa')).toBe(false);
  });
});
