import { useMutation, useQuery } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { localToday } from '@/lib/dates';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import type { GoalProgress } from './goalText';

/** Without a clique: all my current goals. With one: its members' shared goals. */
export function useGoalProgress(cliqueId: string | null) {
  return useQuery({
    queryKey: queryKeys.goals(cliqueId),
    queryFn: async (): Promise<GoalProgress[]> =>
      unwrap(await supabase.rpc('goal_progress', { p_clique_id: cliqueId })),
  });
}

export type NewGoal = Pick<Tables<'goals'>, 'activity_id' | 'metric' | 'target' | 'period' | 'visibility'>;

export function useCreateGoal() {
  return useMutation({
    mutationFn: async (goal: NewGoal) =>
      unwrap(await supabase.from('goals').insert({ ...goal, starts_on: localToday() })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}
