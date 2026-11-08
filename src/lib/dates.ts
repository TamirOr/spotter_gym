// Calendar helpers for local dates written as ISO strings (YYYY-MM-DD), the form Postgres returns.

export type IsoDate = string;

function fromIso(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const next = fromIso(date);
  next.setUTCDate(next.getUTCDate() + days);
  return toIso(next);
}

/** 0 for Sunday. */
export function weekdayOf(date: IsoDate): number {
  return fromIso(date).getUTCDay();
}

/** The week starts on Sunday. */
export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, -weekdayOf(date));
}

export function weekDays(date: IsoDate): IsoDate[] {
  const first = weekStart(date);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

/** Today's date on this device, which is the user's own time zone. */
export function localToday(now: Date = new Date()): IsoDate {
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** "18:00:00" from Postgres becomes "18:00". */
export function shortTime(time: string): string {
  return time.slice(0, 5);
}

export function minutesBetween(from: string | Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 60_000));
}

export function formatLongDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export function formatWeekdayInitial(date: IsoDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(fromIso(date));
}

/** A moment as a short date and time, such as "3 Nov 2026, 14:05", in the reader's time zone. */
export function formatDateTime(at: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' }).format(
    new Date(at),
  );
}
