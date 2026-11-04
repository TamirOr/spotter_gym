import { useMutation, useQuery } from '@tanstack/react-query';

import type { QuickCheer } from '@shared/cheers.ts';
import type { Tables } from '@/lib/database.types';
import { localToday } from '@/lib/dates';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import type { FriendLine } from '../today/api';

export type CheerTarget = { id: string; state: Tables<'checkins'>['state']; athlete: { full_name: string } };

export function useCheerTarget(checkinId: string) {
  return useQuery({
    queryKey: ['checkin', checkinId],
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['clique-today'] }),
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
