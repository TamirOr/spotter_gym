import type { Rpc } from '@/lib/database.types';

export type TodayFacts = Rpc<'my_today'>[number];

// The Today bar follows the user's state (spec: "The Today bar changes with the user's state").
export type TodayBarState =
  | { kind: 'going'; checkinId: string; activityId: string; startedAt: string }
  | { kind: 'goingExpired'; checkinId: string; activityId: string }
  | { kind: 'planned'; activityId: string; time: string | null }
  | { kind: 'done'; checkinId: string; cheerCount: number }
  | { kind: 'friendsTraining'; count: number }
  | { kind: 'quiet' };

export type TodayBarAction = 'going' | 'done' | 'seeCheers';

export function todayBarState(facts: TodayFacts): TodayBarState {
  if (facts.going_checkin_id && facts.going_activity_id && facts.going_started_at) {
    return facts.going_expired
      ? { kind: 'goingExpired', checkinId: facts.going_checkin_id, activityId: facts.going_activity_id }
      : {
          kind: 'going',
          checkinId: facts.going_checkin_id,
          activityId: facts.going_activity_id,
          startedAt: facts.going_started_at,
        };
  }
  // A second workout planned for today comes before the first one's cheers.
  if (facts.planned_activity_id) {
    return { kind: 'planned', activityId: facts.planned_activity_id, time: facts.planned_time };
  }
  if (facts.done_checkin_id) {
    return { kind: 'done', checkinId: facts.done_checkin_id, cheerCount: facts.cheer_count };
  }
  // Rest days are part of training, so a day with no plan stays friendly.
  return facts.friends_training > 0 ? { kind: 'friendsTraining', count: facts.friends_training } : { kind: 'quiet' };
}

export function mainAction(state: TodayBarState): TodayBarAction {
  switch (state.kind) {
    case 'going':
    case 'goingExpired':
      return 'done';
    case 'done':
      return 'seeCheers';
    default:
      return 'going';
  }
}
