import { weekDays, type IsoDate } from '@/lib/dates';

import type { WeekEntry } from '../plan/api';

export type DayContent = {
  /** Workouts logged that day, which can be edited or deleted. */
  logged: WeekEntry[];
  /** Planned workouts still ahead, which can be logged, moved or skipped. */
  planned: WeekEntry[];
};

export function dayContent(entries: WeekEntry[], date: IsoDate): DayContent {
  const onDay = entries.filter((entry) => entry.day === date);
  return {
    logged: onDay.filter((entry) => entry.status === 'done' && entry.checkin_id !== null),
    planned: onDay.filter((entry) => entry.status === 'planned' && entry.plan_item_id !== null),
  };
}

/**
 * Where a planned workout can move: another day of the same week, from today on. A move inside the week
 * still counts as completed on the leaderboard.
 */
export function moveTargets(day: IsoDate, today: IsoDate): IsoDate[] {
  return weekDays(day).filter((candidate) => candidate !== day && candidate >= today);
}
