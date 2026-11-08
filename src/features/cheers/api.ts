import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { QuickCheer } from '@shared/cheers.ts';
import type { Tables } from '@/lib/database.types';
import { localToday } from '@/lib/dates';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import type { FriendLine } from '../today/api';
import { unmarkedIds, type SeenView } from './seen';

export type CheerTarget = { id: string; state: Tables<'checkins'>['state']; athlete: { full_name: string } };

export function useCheerTarget(checkinId: string) {
  return useQuery({
    queryKey: queryKeys.checkin(checkinId),
    queryFn: async (): Promise<CheerTarget> =>
      unwrap(
        await supabase
          .from('checkins')
          .select('id, state, athlete:profiles!inner(full_name)')
          .eq('id', checkinId)
          .single(),
      ),
  });
}

export type CheerInput = { checkinId: string } & ({ type: QuickCheer } | { type: 'note'; body: string });

/** Marks the friend line as cheered straight away, so the button reads "Sent" at once. */
export function useSendCheer() {
  return useMutation({
    mutationFn: async (input: CheerInput) =>
      unwrap(
        await supabase
          .from('reactions')
          .insert({ checkin_id: input.checkinId, type: input.type, body: input.type === 'note' ? input.body : null }),
      ),
    onMutate: ({ checkinId }) => {
      queryClient.setQueriesData<FriendLine[]>({ queryKey: ['clique-today'] }, (lines) =>
        lines?.map((line) => (line.checkin_id === checkinId ? { ...line, cheered: true } : line)),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clique-today'] }),
        queryClient.invalidateQueries({ queryKey: ['note-target'] }),
      ]),
  });
}

export type ReceivedCheer = Pick<Tables<'reactions'>, 'id' | 'type' | 'body' | 'created_at'> & {
  sender: { full_name: string; avatar_url: string | null } | null;
};

/** Cheers on today's workouts. A cheer from a deleted account has no sender. */
export function useCheersToday(userId: string) {
  return useQuery({
    queryKey: queryKeys.cheersToday,
    queryFn: async (): Promise<ReceivedCheer[]> =>
      unwrap(
        await supabase
          .from('reactions')
          .select(
            'id, type, body, created_at, sender:profiles(full_name, avatar_url), checkin:checkins!inner(user_id, local_day)',
          )
          .eq('checkin.user_id', userId)
          .eq('checkin.local_day', localToday())
          .order('created_at', { ascending: false }),
      ),
  });
}

/** Who saw my workouts today. */
export function useSeenToday(userId: string) {
  return useQuery({
    queryKey: queryKeys.seenToday,
    queryFn: async (): Promise<SeenView[]> =>
      unwrap(
        await supabase
          .from('checkin_views')
          .select(
            'checkin_id, viewer_id, seen_at, viewer:profiles(full_name, avatar_url), checkin:checkins!inner(user_id, local_day)',
          )
          .eq('checkin.user_id', userId)
          .eq('checkin.local_day', localToday()),
      ),
  });
}

// Sent ids for this session. A failed call forgets its ids, so they are tried again next time.
const markedThisSession = new Set<string>();

/** Records that the friends' workouts on screen were seen. Each one once per session. */
export function useMarkSeen(checkinIds: (string | null)[]): void {
  const key = checkinIds.join(',');
  useEffect(() => {
    const ids = unmarkedIds(key.split(','), markedThisSession);
    if (ids.length === 0) return;
    ids.forEach((id) => markedThisSession.add(id));
    void supabase.rpc('mark_checkins_seen', { p_checkin_ids: ids }).then(({ error }) => {
      if (error) ids.forEach((id) => markedThisSession.delete(id));
    });
  }, [key]);
}
