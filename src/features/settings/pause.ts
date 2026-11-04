import { addDays, type IsoDate } from '@/lib/dates';

/** Postgres stores an open-ended pause as the date 'infinity'. */
export const OPEN_ENDED = 'infinity';

export type PauseLength = 'week' | 'month' | 'openEnded';

export function pauseUntil(length: PauseLength, today: IsoDate): string {
  switch (length) {
    case 'week':
      return addDays(today, 7);
    case 'month':
      return addDays(today, 30);
    case 'openEnded':
      return OPEN_ENDED;
  }
}

export type PauseState = { paused: false } | { paused: true; until: IsoDate | null };

export function pauseState(pausedUntil: string | null, today: IsoDate): PauseState {
  if (pausedUntil === null) return { paused: false };
  if (pausedUntil === OPEN_ENDED) return { paused: true, until: null };
  return pausedUntil >= today ? { paused: true, until: pausedUntil } : { paused: false };
}
