import { useMutation, useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import type { Tables } from '@/lib/database.types';
import { invalidateWorkoutQueries } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

export type DoneInput = {
  /** My open Going's id finishes it; a new id logs another workout. */
  checkinId: string;
  activityId: string;
  endedAt: Date;
  durationMin: number | null;
  distanceKm: number | null;
  note: string;
};

export function useMarkDone() {
  return useMutation({
    mutationFn: async (input: DoneInput) =>
      unwrap(
        await supabase.rpc('mark_done', {
          p_checkin_id: input.checkinId,
          p_activity_id: input.activityId,
          p_ended_at: input.endedAt.toISOString(),
          p_duration_min: input.durationMin,
          p_distance_km: input.distanceKm,
          p_note: input.note,
        }),
      ),
    onSettled: invalidateWorkoutQueries,
  });
}

export type LoggedWorkout = Pick<
  Tables<'checkins'>,
  'id' | 'activity_id' | 'duration_min' | 'distance_km' | 'note' | 'local_day'
>;

/** One of my logged workouts, to edit it. */
export function useLoggedWorkout(checkinId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.checkin(checkinId ?? ''),
    queryFn: async (): Promise<LoggedWorkout> =>
      unwrap(
        await supabase
          .from('checkins')
          .select('id, activity_id, duration_min, distance_km, note, local_day')
          .eq('id', checkinId!)
          .single(),
      ),
    enabled: !!checkinId,
  });
}

export type WorkoutChanges = Pick<LoggedWorkout, 'activity_id' | 'duration_min' | 'distance_km'> & { note: string };

/** Owners edit their own logs. The day stays; the server keeps edits inside the logging window. */
export function useEditWorkout() {
  return useMutation({
    mutationFn: async ({ checkinId, changes }: { checkinId: string; changes: WorkoutChanges }) =>
      unwrap(
        await supabase
          .from('checkins')
          .update({ ...changes, note: changes.note.trim() || null })
          .eq('id', checkinId),
      ),
    onSettled: invalidateWorkoutQueries,
  });
}

/** Deleting a log also deletes its cheers. */
export function useDeleteWorkout() {
  return useMutation({
    mutationFn: async (checkinId: string) => unwrap(await supabase.from('checkins').delete().eq('id', checkinId)),
    onSettled: invalidateWorkoutQueries,
  });
}

/** The duration of my latest logged workout of this activity, so the log sheet can offer it again. */
export function useLastDuration(activityId: string | null) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.lastDuration(activityId ?? ''),
    queryFn: async (): Promise<number | null> => {
      const rows = unwrap(
        await supabase
          .from('checkins')
          .select('duration_min')
          .eq('user_id', userId)
          .eq('activity_id', activityId!)
          .eq('state', 'done')
          .not('duration_min', 'is', null)
          .order('ended_at', { ascending: false })
          .limit(1),
      );
      return rows[0]?.duration_min ?? null;
    },
    enabled: !!activityId,
  });
}
