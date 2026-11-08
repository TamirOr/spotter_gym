// Every query key in one place, so a mutation can invalidate exactly what it changes.
export const queryKeys = {
  profile: ['profile'] as const,
  activities: ['activities'] as const,
  activityUsage: ['activity-usage'] as const,
  cliques: ['cliques'] as const,
  myToday: ['my-today'] as const,
  cliqueToday: (cliqueId: string) => ['clique-today', cliqueId] as const,
  leaderboard: (cliqueId: string, period: string, periodsAgo: number) =>
    ['leaderboard', cliqueId, period, periodsAgo] as const,
  goals: (cliqueId: string | null) => ['goals', cliqueId ?? 'mine'] as const,
  week: (weekStart: string) => ['week', weekStart] as const,
  planItems: ['plan-items'] as const,
  routines: ['routines'] as const,
  friendships: ['friendships'] as const,
  profileSearch: (query: string) => ['profile-search', query] as const,
  person: (userId: string) => ['person', userId] as const,
  cheersToday: ['cheers-today'] as const,
  recentCheckins: (userId: string) => ['recent-checkins', userId] as const,
  cliqueMembers: (cliqueId: string) => ['clique-members', cliqueId] as const,
};

/** Everything a check-in can change: today, boards, goals and the week grid. */
export const workoutQueries = [
  queryKeys.myToday,
  ['clique-today'],
  ['leaderboard'],
  ['goals'],
  ['week'],
  queryKeys.activityUsage,
] as const;
