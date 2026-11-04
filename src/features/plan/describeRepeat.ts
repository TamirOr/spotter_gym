import type { TFunction } from 'i18next';

import { addDays, formatWeekdayInitial } from '@/lib/dates';

import { WEEKDAYS, type Repeat, type Weekday } from './rrule';

// Weekday names come from Intl, which formats dates, so name days through a known week.
const ANY_SUNDAY = '2026-11-01';

/** A short weekday name in the app language, for any RRULE day. */
export function weekdayName(day: Weekday, locale: string): string {
  const date = addDays(ANY_SUNDAY, WEEKDAYS.indexOf(day));
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

export function weekdayInitial(day: Weekday, locale: string): string {
  return formatWeekdayInitial(addDays(ANY_SUNDAY, WEEKDAYS.indexOf(day)), locale);
}

export function describeRepeat(t: TFunction, repeat: Repeat, startsOn: string, locale: string): string {
  switch (repeat.kind) {
    case 'once':
      return t('plan.rule.once', {
        date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
          new Date(`${startsOn}T00:00:00Z`),
        ),
      });
    case 'weekly': {
      const days = repeat.days.map((day) => weekdayName(day, locale)).join(', ');
      return repeat.intervalWeeks > 1
        ? t('plan.rule.everyNWeeks', { count: repeat.intervalWeeks, days })
        : t('plan.rule.weekly', { days });
    }
    case 'monthly':
      return t('plan.rule.monthly', { day: repeat.day });
  }
}
