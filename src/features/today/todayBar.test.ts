import { mainAction, todayBarState, type TodayFacts } from './todayBar';

const nothing: TodayFacts = {
  today: '2026-11-04',
  planned_plan_item_id: null,
  planned_activity_id: null,
  planned_time: null,
  going_checkin_id: null,
  going_activity_id: null,
  going_started_at: null,
  going_expired: null,
  done_checkin_id: null,
  done_activity_id: null,
  cheer_count: 0,
  friends_training: 0,
};

const planned = { ...nothing, planned_plan_item_id: 'plan', planned_activity_id: 'gym', planned_time: '18:00:00' };
const going = {
  ...planned,
  going_checkin_id: 'checkin',
  going_activity_id: 'gym',
  going_started_at: '2026-11-04T15:00:00Z',
  going_expired: false,
};

describe('todayBarState', () => {
  it('shows the workout planned today', () => {
    expect(todayBarState(planned)).toEqual({ kind: 'planned', activityId: 'gym', time: '18:00:00' });
  });

  it('invites the user to join friends who are training', () => {
    expect(todayBarState({ ...nothing, friends_training: 2 })).toEqual({ kind: 'friendsTraining', count: 2 });
  });

  it('stays friendly when nobody is training yet', () => {
    expect(todayBarState(nothing)).toEqual({ kind: 'quiet' });
  });

  it('shows a Going in progress, even with a plan', () => {
    expect(todayBarState(going)).toMatchObject({ kind: 'going', checkinId: 'checkin' });
  });

  it('asks whether an expired Going happened', () => {
    expect(todayBarState({ ...going, going_expired: true })).toMatchObject({ kind: 'goingExpired' });
  });

  it('shows the cheers once the workout is logged', () => {
    expect(todayBarState({ ...nothing, done_checkin_id: 'done', cheer_count: 3 })).toEqual({
      kind: 'done',
      checkinId: 'done',
      cheerCount: 3,
    });
  });

  it('puts a second planned workout before the first one’s cheers', () => {
    expect(todayBarState({ ...planned, done_checkin_id: 'done' }).kind).toBe('planned');
  });
});

describe('mainAction', () => {
  it('is Going before, Done during and See cheers after', () => {
    expect(mainAction(todayBarState(planned))).toBe('going');
    expect(mainAction(todayBarState(nothing))).toBe('going');
    expect(mainAction(todayBarState(going))).toBe('done');
    expect(mainAction(todayBarState({ ...going, going_expired: true }))).toBe('done');
    expect(mainAction(todayBarState({ ...nothing, done_checkin_id: 'done' }))).toBe('seeCheers');
  });
});
