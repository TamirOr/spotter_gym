import { useMutation, useQuery } from '@tanstack/react-query';

import type { Rpc } from '@/lib/database.types';
import { newId } from '@/lib/ids';
import { invalidateWorkoutQueries, queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import type { TodayFacts } from './todayBar';

export type FriendLine = Rpc<'clique_today'>[number];

export function useMyToday() {
  return useQuery({
    queryKey: queryKeys.myToday,
    queryFn: async (): Promise<TodayFacts> => unwrap(await supabase.rpc('my_today').single()),
  });
}

export function useCliqueToday(cliqueId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.cliqueToday(cliqueId ?? ''),
    queryFn: async (): Promise<FriendLine[]> => unwrap(await supabase.rpc('clique_today', { p_clique_id: cliqueId! })),
    enabled: !!cliqueId,
  });
}

/** Going is the central action: it shows in the bar at once and retries safely with the same id. */
export function useMarkGoing() {
  return useMutation({
    mutationFn: async ({ checkinId, activityId }: { checkinId: string; activityId: string }) =>
      unwrap(await supabase.rpc('mark_going', { p_checkin_id: checkinId, p_activity_id: activityId })),
    onMutate: async ({ checkinId, activityId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myToday });
      const previous = queryClient.getQueryData<TodayFacts>(queryKeys.myToday);
      if (previous) {
        queryClient.setQueryData<TodayFacts>(queryKeys.myToday, {
          ...previous,
          going_checkin_id: checkinId,
          going_activity_id: activityId,
          going_started_at: new Date().toISOString(),
          going_expired: false,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.myToday, context.previous);
    },
    onSettled: invalidateWorkoutQueries,
  });
}

export function markGoingVariables(activityId: string) {
  return { checkinId: newId(), activityId };
}

export function useCancelGoing() {
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('cancel_going')),
    onSettled: invalidateWorkoutQueries,
  });
}
