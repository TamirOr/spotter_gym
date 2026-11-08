import { useEffect } from 'react';

import { invalidateWorkoutQueries, queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';

/**
 * Both sides see status live: a friend's Going, Going photo, a cheer or a nudge refreshes the screens that show it.
 * Realtime applies the same row rules as queries, so only visible changes arrive.
 */
export function useLiveUpdates(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
        void invalidateWorkoutQueries();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.myToday });
        void queryClient.invalidateQueries({ queryKey: queryKeys.cheersToday });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'going_photos' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.goingPhotos });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photo_views' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.goingPhotos });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clique_members' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cliques });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
