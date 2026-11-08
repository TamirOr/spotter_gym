import type { Repeat, Weekday } from './rrule';

// The plan editor's repeat choices, and how they map to a repeat rule and back.

export const REPEAT_CHOICES = ['once', 'weekly', 'everyNWeeks', 'monthly'] as const;
export type RepeatChoice = (typeof REPEAT_CHOICES)[number];

/** "Every N weeks" offers these. The database accepts up to 9. */
export const INTERVAL_CHOICES = [2, 3, 4] as const;

export function needsDays(choice: RepeatChoice): boolean {
  return choice === 'weekly' || choice === 'everyNWeeks';
}

/** A monthly workout repeats on the day of the month of the chosen date. */
export function repeatOf(choice: RepeatChoice, days: Weekday[], intervalWeeks: number, date: string): Repeat {
  switch (choice) {
    case 'once':
      return { kind: 'once' };
    case 'weekly':
      return { kind: 'weekly', days, intervalWeeks: 1 };
    case 'everyNWeeks':
      return { kind: 'weekly', days, intervalWeeks };
    case 'monthly':
      return { kind: 'monthly', day: Number(date.slice(8, 10)) };
  }
}

export function choiceOf(repeat: Repeat): RepeatChoice {
  switch (repeat.kind) {
    case 'once':
      return 'once';
    case 'weekly':
      return repeat.intervalWeeks > 1 ? 'everyNWeeks' : 'weekly';
    case 'monthly':
      return 'monthly';
  }
}

/**
 * The start date to save. An unchanged rule keeps its start, which anchors "every N weeks". A new weekly
 * or monthly rule starts today; a single workout or a monthly one starts on the chosen date.
 */
export function startsOnFor(
  choice: RepeatChoice,
  date: string,
  today: string,
  unchanged?: { startsOn: string },
): string {
  if (unchanged) return unchanged.startsOn;
  return needsDays(choice) ? today : date;
}
