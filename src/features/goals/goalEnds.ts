import { addDays, type IsoDate } from '@/lib/dates';

// A goal's optional end date, offered as a few choices so typing is the exception.

export const END_CHOICES = ['never', 'weeks4', 'months3', 'months6'] as const;
export type EndChoice = (typeof END_CHOICES)[number];

function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  // A day the target month does not have becomes its last day: 31 Jan + 1 month is 28 or 29 Feb.
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function endDateFor(choice: EndChoice, today: IsoDate): IsoDate | null {
  switch (choice) {
    case 'never':
      return null;
    case 'weeks4':
      return addDays(today, 28);
    case 'months3':
      return addMonths(today, 3);
    case 'months6':
      return addMonths(today, 6);
  }
}
