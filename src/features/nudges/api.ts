import { useMutation } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { supabase, unwrap } from '@/lib/supabase';

import type { FriendLine } from '../today/api';

/** A nudge is 🤏 (no body) or a short note. Private between the two friends, once a day. */
export function useSendNudge() {
  return useMutation({
    mutationFn: async ({ recipientId, body }: { recipientId: string; body: string | null }) =>
      unwrap(await supabase.from('nudges').insert({ recipient_id: recipientId, body })),
    onMutate: ({ recipientId }) => {
      queryClient.setQueriesData<FriendLine[]>({ queryKey: ['clique-today'] }, (lines) =>
        lines?.map((line) => (line.user_id === recipientId ? { ...line, nudged: true, can_nudge: false } : line)),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clique-today'] }),
        queryClient.invalidateQueries({ queryKey: ['note-target'] }),
      ]),
  });
}
