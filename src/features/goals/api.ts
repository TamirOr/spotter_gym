import { useMutation, useQuery } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { localToday } from '@/lib/dates';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import type { GoalProgress } from './goalText';

const invalidateGoals = () => queryClient.invalidateQueries({ queryKey: ['goals'] });

/** Without a clique: all my current goals. With one: its members' shared goals. */
export function useGoalProgress(cliqueId: string | null) {
  return useQuery({
    queryKey: queryKeys.goals(cliqueId),
    queryFn: async (): Promise<GoalProgress[]> =>
      unwrap(await supabase.rpc('goal_progress', { p_clique_id: cliqueId })),
  });
}

export type NewGoal = Pick<
  Tables<'goals'>,
  'activity_id' | 'metric' | 'target' | 'period' | 'visibility' | 'ends_on'
>;

export function useCreateGoal() {
  return useMutation({
    mutationFn: async (goal: NewGoal) =>
      unwrap(await supabase.from('goals').insert({ ...goal, starts_on: localToday() })),
    onSuccess: invalidateGoals,
  });
}

/**
 * A goal as the editor shows it. When an earlier edit is waiting for the next period, the editor starts
 * from that edit, since it is what the goal will become.
 */
export type GoalForEdit = NewGoal & { id: string };

export function useGoalForEdit(goalId: string) {
  return useQuery({
    queryKey: queryKeys.goal(goalId),
    queryFn: async (): Promise<GoalForEdit> => {
      const rows = unwrap(
        await supabase
          .from('goals')
          .select('id, activity_id, metric, target, period, visibility, starts_on, ends_on, previous_id')
          .or(`id.eq.${goalId},previous_id.eq.${goalId}`),
      );
      const goal = rows.find((row) => row.id === goalId);
      if (!goal) throw new Error('not_found');
      const pending = rows.find((row) => row.previous_id === goalId && row.starts_on > localToday());
      const shown = pending ?? goal;
      return {
        id: goal.id,
        activity_id: goal.activity_id,
        metric: goal.metric,
        target: shown.target,
        period: shown.period,
        visibility: goal.visibility,
        ends_on: shown.ends_on,
      };
    },
  });
}

export function useUpdateGoal() {
  return useMutation({
    mutationFn: async (goal: GoalForEdit) =>
      unwrap(
        await supabase.rpc('update_goal', {
          p_goal_id: goal.id,
          p_target: goal.target,
          p_period: goal.period,
          p_visibility: goal.visibility,
          p_ends_on: goal.ends_on,
        }),
      ),
    onSuccess: invalidateGoals,
  });
}

/** Deleting a goal also deletes a change waiting for the next period. */
export function useDeleteGoal() {
  return useMutation({
    mutationFn: async (goalId: string) => unwrap(await supabase.from('goals').delete().eq('id', goalId)),
    onSuccess: invalidateGoals,
  });
}
