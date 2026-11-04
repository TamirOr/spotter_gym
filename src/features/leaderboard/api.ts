import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

import type { LeaderboardRow, Period } from './leaderboard';

export function useLeaderboard(cliqueId: string | undefined, period: Period, periodsAgo = 0) {
  return useQuery({
    queryKey: queryKeys.leaderboard(cliqueId ?? '', period, periodsAgo),
    queryFn: async (): Promise<LeaderboardRow[]> =>
      unwrap(
        await supabase.rpc('clique_leaderboard', {
          p_clique_id: cliqueId!,
          p_period: period,
          p_periods_ago: periodsAgo,
        }),
      ),
    enabled: !!cliqueId,
  });
}
