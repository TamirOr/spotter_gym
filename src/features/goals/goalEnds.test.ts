import { endDateFor } from './goalEnds';

describe('endDateFor', () => {
  it('gives no end date for a goal that keeps going', () => {
    expect(endDateFor('never', '2026-11-08')).toBeNull();
  });

  it('counts weeks and months from today', () => {
    expect(endDateFor('weeks4', '2026-11-08')).toBe('2026-12-06');
    expect(endDateFor('months3', '2026-11-08')).toBe('2027-02-08');
    expect(endDateFor('months6', '2026-11-08')).toBe('2027-05-08');
  });

  it('ends on the last day of a shorter month', () => {
    expect(endDateFor('months3', '2026-11-30')).toBe('2027-02-28');
  });
});
