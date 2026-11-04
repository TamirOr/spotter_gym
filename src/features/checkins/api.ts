import { useMutation } from '@tanstack/react-query';

import { invalidateWorkoutQueries } from '@/lib/queryClient';
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
