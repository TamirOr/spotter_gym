import type { TFunction } from 'i18next';

import type { Rpc, Tables } from '@/lib/database.types';

export type Goal = Pick<Tables<'goals'>, 'metric' | 'target' | 'period'>;
export type GoalProgress = Rpc<'goal_progress'>[number];

/** "Gym 4 times a week", "Walking: 5 km a day", "8,000 steps a day". */
export function goalTitle(t: TFunction, goal: Goal, activityName: string, locale: string): string {
  const count = goal.target;
  const formatted = new Intl.NumberFormat(locale).format(count);
  switch (goal.metric) {
    case 'sessions':
      return t(`goal.sessions.${goal.period}`, { activity: activityName, count });
    case 'distance_km':
      return t(`goal.distance_km.${goal.period}`, { activity: activityName, count: formatted });
    case 'steps':
      return t(`goal.steps.${goal.period}`, { count: formatted });
  }
}

/** Progress toward the target, from 0 to 1. */
export function goalFraction(goal: Pick<GoalProgress, 'progress' | 'target'>): number {
  return goal.target > 0 ? Math.min(1, goal.progress / goal.target) : 0;
}

/** Common targets come first, so typing is the exception. */
export const QUICK_TARGETS: Record<Goal['metric'], number[]> = {
  sessions: [2, 3, 4, 5],
  distance_km: [3, 5, 10],
  steps: [6000, 8000, 10000],
};
