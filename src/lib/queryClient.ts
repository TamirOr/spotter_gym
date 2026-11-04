import { QueryClient } from '@tanstack/react-query';

import { workoutQueries } from './queryKeys';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
    mutations: { retry: 2 },
  },
});

export function invalidateWorkoutQueries(): Promise<void[]> {
  return Promise.all(workoutQueries.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
