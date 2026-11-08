import { useMutation, useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import type { Rpc, Tables } from '@/lib/database.types';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import { groupFriendships, isSearchable, type FriendGroups } from './friendships';

export type Person = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'>;
export type SearchResult = Rpc<'search_profiles'>[number];

export type FriendsData = FriendGroups & { people: Map<string, Person> };

export function useFriends() {
  const me = useUserId();
  return useQuery({
    queryKey: queryKeys.friendships,
    queryFn: async (): Promise<FriendsData> => {
      const rows = unwrap(await supabase.from('friendships').select('user_low, user_high, status, requested_by'));
      const groups = groupFriendships(rows, me);
      const ids = [...groups.friends, ...groups.incoming, ...groups.outgoing, ...groups.blocked];
      const people =
        ids.length > 0 ? unwrap(await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids)) : [];
      return { ...groups, people: new Map(people.map((person) => [person.id, person])) };
    },
  });
}

/** Someone's name and photo, as far as row rules let me see them. */
export function usePerson(userId: string) {
  return useQuery({
    queryKey: queryKeys.person(userId),
    queryFn: async (): Promise<Person> =>
      unwrap(await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', userId).single()),
  });
}

export function useProfileSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.profileSearch(trimmed),
    queryFn: async (): Promise<SearchResult[]> => unwrap(await supabase.rpc('search_profiles', { p_query: trimmed })),
    enabled: isSearchable(trimmed),
  });
}

function invalidateFriends() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.friendships }),
    queryClient.invalidateQueries({ queryKey: ['profile-search'] }),
  ]);
}

type FriendAction = 'request_friend' | 'decline_friend_request' | 'remove_friendship' | 'block_user';

/** One mutation per friendship action, each taking the other person's id. */
export function useFriendAction(action: FriendAction) {
  return useMutation({
    mutationFn: async (other: string) => {
      unwrap(await supabase.rpc(action, { p_other: other }));
    },
    onSuccess: invalidateFriends,
  });
}

/** What "Send a note" opens on a friend's profile: a cheer on their open workout, or a nudge. */
export type NoteTarget = { kind: 'cheer'; checkinId: string } | { kind: 'nudge' } | null;

/** The server decides who may be cheered or nudged; this asks it for one friend. */
export function useNoteTarget(userId: string) {
  return useQuery({
    queryKey: queryKeys.noteTarget(userId),
    queryFn: async (): Promise<NoteTarget> => {
      const [latest] = unwrap(
        await supabase
          .from('checkins')
          .select('id')
          .eq('user_id', userId)
          .in('state', ['going', 'done'])
          .order('started_at', { ascending: false })
          .limit(1),
      );
      if (latest && unwrap(await supabase.rpc('can_cheer', { p_checkin_id: latest.id }))) {
        return { kind: 'cheer', checkinId: latest.id };
      }
      return unwrap(await supabase.rpc('can_nudge', { p_recipient_id: userId })) ? { kind: 'nudge' } : null;
    },
  });
}
