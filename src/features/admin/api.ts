import { useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import { parseSupport, type AdminUser, type Health, type Support } from './users';

// Admin reads and actions. The server checks that the caller is an admin; see the admin migration.

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: async (): Promise<AdminUser[]> => unwrap(await supabase.rpc('admin_users')),
  });
}

export function useAddedUsers() {
  return useQuery({
    queryKey: queryKeys.adminAddedUsers,
    queryFn: async () => unwrap(await supabase.rpc('admin_added_users')),
  });
}

export function useAdminHealth() {
  return useQuery({
    queryKey: queryKeys.adminHealth,
    queryFn: async (): Promise<Health | null> => unwrap(await supabase.rpc('admin_health'))[0] ?? null,
  });
}

export function useUserSupport(userId: string) {
  return useQuery({
    queryKey: queryKeys.adminUserSupport(userId),
    queryFn: async (): Promise<Support> =>
      parseSupport(unwrap(await supabase.rpc('admin_user_support', { p_user_id: userId }))),
  });
}

const refreshAdmin = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

export function useApproveUser() {
  return useMutation({
    mutationFn: async (userId: string) => {
      unwrap(await supabase.rpc('approve_user', { p_user_id: userId }));
    },
    onSuccess: refreshAdmin,
  });
}

export function useRejectUser() {
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      unwrap(await supabase.rpc('reject_user', { p_user_id: userId, p_reason: reason }));
    },
    onSuccess: refreshAdmin,
  });
}

export function useSetUserActive() {
  return useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      unwrap(await supabase.rpc('set_user_active', { p_user_id: userId, p_active: active }));
    },
    onSuccess: refreshAdmin,
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: async (userId: string) => {
      unwrap(await supabase.rpc('delete_user', { p_user_id: userId }));
    },
    onSuccess: refreshAdmin,
  });
}

export function useAddUser() {
  return useMutation({
    mutationFn: async (email: string) => {
      unwrap(await supabase.rpc('add_user', { p_email: email }));
    },
    onSuccess: refreshAdmin,
  });
}

export function useCancelAddedUser() {
  return useMutation({
    mutationFn: async (email: string) => {
      unwrap(await supabase.rpc('cancel_added_user', { p_email: email }));
    },
    onSuccess: refreshAdmin,
  });
}
