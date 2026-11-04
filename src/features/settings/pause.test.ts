import { OPEN_ENDED, pauseState, pauseUntil } from './pause';

describe('pause', () => {
  it('ends a week or a month from today, or never', () => {
    expect(pauseUntil('week', '2026-11-04')).toBe('2026-11-11');
    expect(pauseUntil('month', '2026-11-04')).toBe('2026-12-04');
    expect(pauseUntil('openEnded', '2026-11-04')).toBe(OPEN_ENDED);
  });

  it('knows whether the user is paused today', () => {
    expect(pauseState(null, '2026-11-04')).toEqual({ paused: false });
    expect(pauseState('2026-11-04', '2026-11-04')).toEqual({ paused: true, until: '2026-11-04' });
    expect(pauseState('2026-11-03', '2026-11-04')).toEqual({ paused: false });
    expect(pauseState(OPEN_ENDED, '2026-11-04')).toEqual({ paused: true, until: null });
  });
});
