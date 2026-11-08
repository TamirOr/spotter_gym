import { installGuide, isAppleMobile } from './install';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

describe('installGuide', () => {
  const iphone = { web: true, standalone: false, userAgent: IPHONE, maxTouchPoints: 5 };

  it('walks iPhone Safari through Add to Home Screen', () => {
    expect(installGuide(iphone)).toBe('ios');
  });

  it('treats an iPad, which reports a Mac user agent, as iOS', () => {
    expect(installGuide({ ...iphone, userAgent: MAC, maxTouchPoints: 5 })).toBe('ios');
  });

  it('walks Android through installing from the browser', () => {
    expect(installGuide({ ...iphone, userAgent: ANDROID })).toBe('android');
  });

  it('gives other browsers the generic hint', () => {
    expect(installGuide({ ...iphone, userAgent: MAC, maxTouchPoints: 0 })).toBe('other');
  });

  it('shows nothing once opened from the Home Screen, or outside the web', () => {
    expect(installGuide({ ...iphone, standalone: true })).toBe('none');
    expect(installGuide({ ...iphone, userAgent: ANDROID, standalone: true })).toBe('none');
    expect(installGuide({ ...iphone, web: false })).toBe('none');
  });
});

describe('isAppleMobile', () => {
  it('is true for iPhone and iPad only', () => {
    expect(isAppleMobile({ userAgent: IPHONE, maxTouchPoints: 5 })).toBe(true);
    expect(isAppleMobile({ userAgent: MAC, maxTouchPoints: 5 })).toBe(true);
    expect(isAppleMobile({ userAgent: MAC, maxTouchPoints: 0 })).toBe(false);
    expect(isAppleMobile({ userAgent: ANDROID, maxTouchPoints: 5 })).toBe(false);
  });
});
