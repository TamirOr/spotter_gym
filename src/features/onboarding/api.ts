import { useMutation } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import { normalizeInviteCode } from './inviteCode';
import { pendingInvite } from './pendingInvite';

/** Redeems an invite: joins the app, befriends the inviter and joins their clique. */
export function useRedeemInvite() {
  return useMutation({
    mutationFn: async (code: string) =>
      unwrap(await supabase.rpc('redeem_invite', { p_code: normalizeInviteCode(code) })),
    onSuccess: async () => {
      await pendingInvite.clear();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cliques }),
      ]);
    },
  });
}
