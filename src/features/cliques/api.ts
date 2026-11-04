import { useMutation, useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import type { Tables } from '@/lib/database.types';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

export type Clique = Pick<Tables<'cliques'>, 'id' | 'name' | 'photo_url' | 'owner_id'>;
export type Membership = { status: Tables<'clique_members'>['status']; muted: boolean; clique: Clique };

/** My cliques and my pending invites, from my own membership rows. */
export function useMemberships() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.cliques,
    queryFn: async (): Promise<Membership[]> => {
      return unwrap(
        await supabase
          .from('clique_members')
          .select('status, muted, clique:cliques!inner(id, name, photo_url, owner_id)')
          .eq('user_id', userId)
          .in('status', ['active', 'invited']),
      );
    },
  });
}

export function useMyCliques(): { cliques: Clique[]; invites: Clique[]; isLoading: boolean } {
  const { data = [], isLoading } = useMemberships();
  return {
    cliques: data.filter((row) => row.status === 'active').map((row) => row.clique),
    invites: data.filter((row) => row.status === 'invited').map((row) => row.clique),
    isLoading,
  };
}

export type CliqueMember = { user_id: string; status: Tables<'clique_members'>['status'] };

export function useCliqueMembers(cliqueId: string) {
  return useQuery({
    queryKey: queryKeys.cliqueMembers(cliqueId),
    queryFn: async (): Promise<CliqueMember[]> =>
      unwrap(await supabase.from('clique_members').select('user_id, status').eq('clique_id', cliqueId)),
  });
}

function invalidateCliques() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.cliques }),
    queryClient.invalidateQueries({ queryKey: ['clique-members'] }),
    queryClient.invalidateQueries({ queryKey: ['clique-today'] }),
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
  ]);
}

export function useCreateClique() {
  return useMutation({
    mutationFn: async (name: string): Promise<Clique> => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return unwrap(
        await supabase
          .from('cliques')
          .insert({ name: name.trim(), time_zone: timeZone })
          .select('id, name, photo_url, owner_id')
          .single(),
      );
    },
    onSuccess: invalidateCliques,
  });
}

export function useRespondToInvite() {
  return useMutation({
    mutationFn: async ({ cliqueId, accept }: { cliqueId: string; accept: boolean }) =>
      unwrap(await supabase.rpc('respond_clique_invite', { p_clique_id: cliqueId, p_accept: accept })),
    onSuccess: invalidateCliques,
  });
}

export function useLeaveClique() {
  return useMutation({
    mutationFn: async (cliqueId: string) => unwrap(await supabase.rpc('leave_clique', { p_clique_id: cliqueId })),
    onSuccess: invalidateCliques,
  });
}

export function useInviteToClique() {
  return useMutation({
    mutationFn: async ({ cliqueId, userId }: { cliqueId: string; userId: string }) =>
      unwrap(await supabase.rpc('invite_to_clique', { p_clique_id: cliqueId, p_user_id: userId })),
    onSuccess: invalidateCliques,
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: async (cliqueId: string | null) =>
      unwrap(await supabase.rpc('create_invite', { p_clique_id: cliqueId })),
  });
}
