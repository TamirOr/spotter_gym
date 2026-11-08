import { useMutation, useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import type { Weekday } from '@/features/plan/rrule';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import type { RoutineDraft } from './routine';

export type Routine = {
  id: string;
  activity_id: string;
  times_per_week: number;
  routine_days: { weekday: Weekday; name: string | null }[];
};

export type CliqueRoutine = Routine & { user_id: string };

/** Mine, a person's and every clique's routine lists all start with queryKeys.routines. */
function invalidateRoutines() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.routines });
}

async function routinesOf(userId: string): Promise<Routine[]> {
  return unwrap(
    await supabase
      .from('routines')
      .select('id, activity_id, times_per_week, routine_days(weekday, name)')
      .eq('user_id', userId)
      .order('created_at'),
  );
}

/** My own routines. Clique mates' routines are readable too, so the list is filtered to me. */
export function useRoutines() {
  const userId = useUserId();
  return useQuery({ queryKey: queryKeys.routines, queryFn: () => routinesOf(userId) });
}

/** Someone else's routines. Empty unless we share a clique. */
export function usePersonRoutines(userId: string) {
  return useQuery({ queryKey: queryKeys.personRoutines(userId), queryFn: () => routinesOf(userId) });
}

/** The routines of everyone active in the clique, me included. */
export function useCliqueRoutines(cliqueId: string) {
  return useQuery({
    queryKey: queryKeys.cliqueRoutines(cliqueId),
    queryFn: async (): Promise<CliqueRoutine[]> =>
      unwrap(await supabase.rpc('clique_routines', { p_clique_id: cliqueId })).map(
        ({ routine_id, user_id, activity_id, times_per_week, days }) => ({
          id: routine_id,
          user_id,
          activity_id,
          times_per_week,
          routine_days: days,
        }),
      ),
  });
}

export function useRoutine(routineId: string | undefined) {
  const { data: routines = [] } = useRoutines();
  return routines.find((routine) => routine.id === routineId);
}

/** Creates a routine when routineId is null, otherwise replaces it with the draft. */
export function useSaveRoutine() {
  return useMutation({
    mutationFn: async ({
      routineId,
      draft,
    }: {
      routineId: string | null;
      draft: RoutineDraft & { activityId: string };
    }) =>
      unwrap(
        await supabase.rpc('save_routine', {
          p_routine_id: routineId,
          p_activity_id: draft.activityId,
          p_times_per_week: draft.timesPerWeek,
          p_days: draft.days,
        }),
      ),
    onSuccess: invalidateRoutines,
  });
}

export function useRemoveRoutine() {
  return useMutation({
    mutationFn: async (routineId: string) => unwrap(await supabase.from('routines').delete().eq('id', routineId)),
    onSuccess: invalidateRoutines,
  });
}
