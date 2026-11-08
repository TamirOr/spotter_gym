import { useMutation, useQuery } from '@tanstack/react-query';

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

function invalidateRoutines() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.routines });
}

export function useRoutines() {
  return useQuery({
    queryKey: queryKeys.routines,
    queryFn: async (): Promise<Routine[]> =>
      unwrap(
        await supabase
          .from('routines')
          .select('id, activity_id, times_per_week, routine_days(weekday, name)')
          .order('created_at'),
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
