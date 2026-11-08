import { WEEKDAYS, type Weekday } from '@/features/plan/rrule';

// The editing model for a routine. The database enforces the rules (see save_routine);
// these helpers keep a draft valid so the user never meets those errors.

export const MAX_TIMES_PER_WEEK = 7;

export type RoutineDay = { weekday: Weekday; name: string };

export type RoutineDraft = { activityId: string | null; timesPerWeek: number; days: RoutineDay[] };

export const NEW_ROUTINE: RoutineDraft = { activityId: null, timesPerWeek: 3, days: [] };

function inWeekOrder(days: RoutineDay[]): RoutineDay[] {
  return [...days].sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday));
}

/** Each chosen day is one workout, so choosing more days than sessions adds a session. */
export function toggleDay(draft: RoutineDraft, weekday: Weekday): RoutineDraft {
  if (draft.days.some((day) => day.weekday === weekday)) {
    return { ...draft, days: draft.days.filter((day) => day.weekday !== weekday) };
  }
  const days = inWeekOrder([...draft.days, { weekday, name: '' }]);
  return { ...draft, days, timesPerWeek: Math.max(draft.timesPerWeek, days.length) };
}

export function nameDay(draft: RoutineDraft, weekday: Weekday, name: string): RoutineDraft {
  return { ...draft, days: draft.days.map((day) => (day.weekday === weekday ? { ...day, name } : day)) };
}

/** Fewer sessions than chosen days is not offered: remove a day first. */
export function timesPerWeekOptions(draft: RoutineDraft): number[] {
  const fewest = Math.max(1, draft.days.length);
  return Array.from({ length: MAX_TIMES_PER_WEEK - fewest + 1 }, (_, index) => fewest + index);
}

export function canSave(draft: RoutineDraft): draft is RoutineDraft & { activityId: string } {
  return draft.activityId !== null && draft.days.length <= draft.timesPerWeek;
}

export function selectedDays(draft: RoutineDraft): Weekday[] {
  return draft.days.map((day) => day.weekday);
}

type SavedRoutine = {
  activity_id: string;
  times_per_week: number;
  routine_days: { weekday: Weekday; name: string | null }[];
};

export function draftOf(routine: SavedRoutine): RoutineDraft {
  return {
    activityId: routine.activity_id,
    timesPerWeek: routine.times_per_week,
    days: inWeekOrder(routine.routine_days.map(({ weekday, name }) => ({ weekday, name: name ?? '' }))),
  };
}
