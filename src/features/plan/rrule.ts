// The plan's repeat rules, written as the iCal RRULE subset the database accepts
// (see public.rrule_occurs_on). The database decides which days a rule falls on.

export const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type Repeat =
  { kind: 'once' } | { kind: 'weekly'; days: Weekday[]; intervalWeeks: number } | { kind: 'monthly'; day: number };

function sortDays(days: Weekday[]): Weekday[] {
  return [...new Set(days)].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

export function toRRule(repeat: Repeat): string | null {
  switch (repeat.kind) {
    case 'once':
      return null;
    case 'weekly': {
      if (repeat.days.length === 0) throw new Error('A weekly rule needs at least one day');
      const interval = repeat.intervalWeeks > 1 ? `;INTERVAL=${repeat.intervalWeeks}` : '';
      return `FREQ=WEEKLY${interval};BYDAY=${sortDays(repeat.days).join(',')}`;
    }
    case 'monthly':
      return `FREQ=MONTHLY;BYMONTHDAY=${repeat.day}`;
  }
}

export function parseRRule(rrule: string | null): Repeat {
  if (rrule === null) return { kind: 'once' };
  const parts = Object.fromEntries(rrule.split(';').map((part) => part.split('=') as [string, string]));
  if (parts.FREQ === 'WEEKLY') {
    return {
      kind: 'weekly',
      days: sortDays(parts.BYDAY.split(',') as Weekday[]),
      intervalWeeks: Number(parts.INTERVAL ?? 1),
    };
  }
  if (parts.FREQ === 'MONTHLY') return { kind: 'monthly', day: Number(parts.BYMONTHDAY) };
  throw new Error(`Unsupported repeat rule: ${rrule}`);
}

/** The weekday of an ISO date, as an RRULE day. */
export function weekdayOfDate(date: string): Weekday {
  const [year, month, day] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}
