import { useMutation, useQuery } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;

export type ProfileChanges = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'avatar_url'
    | 'onboarded_at'
    | 'language'
    | 'time_zone'
    | 'paused_until'
    | 'nudges_enabled'
    | 'muted_notification_kinds'
    | 'quiet_hours_start'
    | 'quiet_hours_end'
    | 'going_ignores_quiet_hours'
  >
>;

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => unwrap(await supabase.rpc('get_my_profile')),
    enabled,
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: ProfileChanges }) => {
      unwrap(await supabase.from('profiles').update(changes).eq('id', id));
    },
    onMutate: async ({ changes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });
      const previous = queryClient.getQueryData<Profile>(queryKeys.profile);
      if (previous) queryClient.setQueryData<Profile>(queryKeys.profile, { ...previous, ...changes });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.profile, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      unwrap(await supabase.rpc('delete_my_account'));
      await supabase.auth.signOut();
    },
  });
}
