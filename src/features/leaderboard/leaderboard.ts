import type { Rpc } from '@/lib/database.types';

export type LeaderboardRow = Rpc<'clique_leaderboard'>[number];
export type Period = 'week' | 'month';

export function formatPercent(score: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(score);
}

export function standingOf(rows: LeaderboardRow[], userId: string): LeaderboardRow | undefined {
  return rows.find((row) => row.user_id === userId);
}

/** Everyone who shared first place. */
export function winners(rows: LeaderboardRow[]): LeaderboardRow[] {
  return rows.filter((row) => row.rank === 1);
}

/** One segment per planned workout, filled for each completed one, as on the Today screen. */
export function weekSegments(planned: number, completed: number): boolean[] {
  return Array.from({ length: planned }, (_, index) => index < completed);
}
