import { useMutation, useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import { countUsage, type Activity } from './activities';

export function useActivities() {
  return useQuery({
    queryKey: queryKeys.activities,
    queryFn: async (): Promise<Activity[]> =>
      unwrap(await supabase.from('activities').select('id, owner_id, name, name_he, aliases')),
    staleTime: Infinity,
  });
}

/** Looks an activity up by id. Friends' custom activities are included once they are visible. */
export function useActivity(id: string | null | undefined): Activity | undefined {
  const { data } = useActivities();
  return id ? data?.find((activity) => activity.id === id) : undefined;
}

/** How often I used each activity in my recent check-ins, to list favourites first. */
export function useActivityUsage() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.activityUsage,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('checkins')
          .select('activity_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(200),
      );
      return countUsage(rows.map((row) => row.activity_id));
    },
  });
}

export type ActivityMatch = { activityId: string; exact: boolean } | null;

export async function matchActivity(name: string): Promise<ActivityMatch> {
  const [match] = unwrap(await supabase.rpc('match_activity', { p_name: name }));
  return match ? { activityId: match.activity_id, exact: match.exact } : null;
}

export function useCreateActivity() {
  return useMutation({
    mutationFn: async (name: string): Promise<Activity> =>
      unwrap(
        await supabase.from('activities').insert({ name }).select('id, owner_id, name, name_he, aliases').single(),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
  });
}
