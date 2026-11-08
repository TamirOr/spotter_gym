import { weekDays } from '@/lib/dates';

import type { WeekEntry } from '../plan/api';

export type DayCell = {
  date: string;
  isToday: boolean;
  /** Done shows a check; planned an empty ring. A missed or skipped day shows nothing: encourage, never shame. */
  mark: 'done' | 'planned' | 'none';
  activityId: string | null;
};

export function weekGrid(today: string, entries: WeekEntry[]): DayCell[] {
  return weekDays(today).map((date) => {
    const onDay = entries.filter((entry) => entry.day === date);
    const done = onDay.find((entry) => entry.status === 'done');
    const planned = onDay.find((entry) => entry.status === 'planned');
    const shown = done ?? planned;
    return {
      date,
      isToday: date === today,
      mark: done ? 'done' : planned ? 'planned' : 'none',
      activityId: shown?.activity_id ?? null,
    };
  });
}
