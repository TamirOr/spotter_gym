import { base64UrlToBytes, pushSupport } from './pushSupport';

describe('pushSupport', () => {
  const full = { standalone: true, hasServiceWorker: true, hasPushManager: true, hasNotification: true };

  it('is available in the installed app', () => {
    expect(pushSupport(full)).toBe('available');
  });

  it('needs the Home Screen app in Safari', () => {
    expect(pushSupport({ ...full, standalone: false })).toBe('needsInstall');
  });

  it('is unsupported on older iPhones', () => {
    expect(pushSupport({ ...full, hasPushManager: false })).toBe('unsupported');
    expect(pushSupport({ ...full, hasNotification: false, standalone: false })).toBe('unsupported');
  });
});

describe('base64UrlToBytes', () => {
  it('decodes URL-safe base64 without padding', () => {
    expect([...base64UrlToBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239]);
  });
});
