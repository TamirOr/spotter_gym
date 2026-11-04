import { codeFromParam, inviteUrl, isWellFormedInviteCode, normalizeInviteCode } from './inviteCode';

describe('invite codes', () => {
  it('tidies what people type', () => {
    expect(normalizeInviteCode(' k7pm 2x ')).toBe('K7PM2X');
  });

  it('accepts six characters without look-alikes', () => {
    expect(isWellFormedInviteCode('k7pm2x')).toBe(true);
    expect(isWellFormedInviteCode('K7PM2')).toBe(false);
    expect(isWellFormedInviteCode('K7PM2O')).toBe(false);
    expect(isWellFormedInviteCode('K7PM21')).toBe(false);
  });

  it('builds the link and reads the code back', () => {
    expect(inviteUrl('https://spotter.expo.app', 'K7PM2X')).toBe('https://spotter.expo.app/welcome?code=K7PM2X');
    expect(codeFromParam('k7pm2x')).toBe('K7PM2X');
    expect(codeFromParam(['K7PM2X', 'other'])).toBe('K7PM2X');
    expect(codeFromParam('nope')).toBe('');
    expect(codeFromParam(undefined)).toBe('');
  });
});
