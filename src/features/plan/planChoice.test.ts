import { choiceOf, needsDays, repeatOf, startsOnFor } from './planChoice';
import { parseRRule, toRRule } from './rrule';

describe('repeatOf', () => {
  it('builds each kind of rule', () => {
    expect(toRRule(repeatOf('once', ['MO'], 2, '2026-11-12'))).toBeNull();
    expect(toRRule(repeatOf('weekly', ['TH', 'MO'], 3, '2026-11-12'))).toBe('FREQ=WEEKLY;BYDAY=MO,TH');
    expect(toRRule(repeatOf('everyNWeeks', ['TH'], 3, '2026-11-12'))).toBe('FREQ=WEEKLY;INTERVAL=3;BYDAY=TH');
    expect(toRRule(repeatOf('monthly', [], 2, '2026-11-12'))).toBe('FREQ=MONTHLY;BYMONTHDAY=12');
  });
});

describe('choiceOf', () => {
  it('reads a saved rule back as the choice that made it', () => {
    expect(choiceOf(parseRRule(null))).toBe('once');
    expect(choiceOf(parseRRule('FREQ=WEEKLY;BYDAY=SU'))).toBe('weekly');
    expect(choiceOf(parseRRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=SU'))).toBe('everyNWeeks');
    expect(choiceOf(parseRRule('FREQ=MONTHLY;BYMONTHDAY=3'))).toBe('monthly');
  });
});

describe('needsDays', () => {
  it('asks for weekdays only for weekly rules', () => {
    expect(needsDays('weekly')).toBe(true);
    expect(needsDays('everyNWeeks')).toBe(true);
    expect(needsDays('once')).toBe(false);
    expect(needsDays('monthly')).toBe(false);
  });
});

describe('startsOnFor', () => {
  it('keeps the start of an unchanged rule', () => {
    expect(startsOnFor('everyNWeeks', '2026-11-12', '2026-11-08', { startsOn: '2026-10-01' })).toBe('2026-10-01');
  });

  it('starts a new weekly rule today and a dated one on its date', () => {
    expect(startsOnFor('weekly', '2026-11-12', '2026-11-08')).toBe('2026-11-08');
    expect(startsOnFor('once', '2026-11-12', '2026-11-08')).toBe('2026-11-12');
    expect(startsOnFor('monthly', '2026-11-12', '2026-11-08')).toBe('2026-11-12');
  });
});
