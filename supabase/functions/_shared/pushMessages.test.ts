import { activityIdsIn, groupNotifications, pushMessage, type ClaimedNotification } from './pushMessages.ts';

let nextId = 1;
const row = (overrides: Partial<ClaimedNotification>): ClaimedNotification => ({
  id: nextId++,
  recipient_id: 'noa',
  language: 'he',
  kind: 'going',
  payload: {},
  group_key: 'going',
  ...overrides,
});

const names = new Map([['gym', { he: 'חדר כושר', en: 'Gym' }]]);

describe('groupNotifications', () => {
  it('makes one group per recipient and group key', () => {
    const groups = groupNotifications([
      row({ recipient_id: 'noa', group_key: 'going' }),
      row({ recipient_id: 'noa', group_key: 'going' }),
      row({ recipient_id: 'yoav', group_key: 'going' }),
      row({ recipient_id: 'noa', kind: 'cheer', group_key: 'cheer:1' }),
    ]);
    expect(groups.map((group) => [group.recipientId, group.notifications.length])).toEqual([
      ['noa', 2],
      ['yoav', 1],
      ['noa', 1],
    ]);
  });

  it('collects activity ids once', () => {
    const groups = groupNotifications([
      row({ payload: { activity_id: 'gym' } }),
      row({ payload: { activity_id: 'gym' } }),
    ]);
    expect(activityIdsIn(groups)).toEqual(['gym']);
  });
});

describe('pushMessage', () => {
  it('announces a Going in the recipient’s language and opens the cheer sheet', () => {
    const payload = { actor_name: 'יואב', activity_id: 'gym', checkin_id: 'c1' };
    const [hebrew] = groupNotifications([row({ payload })]);
    expect(pushMessage(hebrew, names)).toEqual({
      title: 'יואב',
      body: 'בדרך לחדר כושר. לעודד?',
      url: '/cheer/c1',
      tag: 'going:c1',
    });
    const [english] = groupNotifications([row({ language: 'en', payload })]);
    expect(pushMessage(english, names).body).toBe('Going to Gym. Send a cheer?');
  });

  it('groups several friends training at once', () => {
    const [group] = groupNotifications([
      row({ payload: { actor_name: 'יואב', checkin_id: 'c1' } }),
      row({ payload: { actor_name: 'מאיה', checkin_id: 'c2' } }),
      row({ payload: { actor_name: 'איתן', checkin_id: 'c3' } }),
    ]);
    expect(pushMessage(group, names)).toMatchObject({ body: '3 חברים מתאמנים עכשיו', url: '/' });
  });

  it('shows a quick cheer as the reader’s own word, and a note as written', () => {
    const [word] = groupNotifications([
      row({
        kind: 'cheer',
        language: 'en',
        group_key: 'cheer:c1',
        payload: { type: 'yalla', sender_name: 'Maya', checkin_id: 'c1' },
      }),
    ]);
    expect(pushMessage(word, names)).toMatchObject({ title: 'Maya', body: 'Let’s go!' });

    const [note] = groupNotifications([
      row({
        kind: 'cheer',
        group_key: 'cheer:c1',
        payload: { type: 'note', body: 'יאללה אלופה', sender_name: 'מאיה' },
      }),
    ]);
    expect(pushMessage(note, names).body).toBe('יאללה אלופה');
  });

  it('groups cheers on one workout into a single push', () => {
    const [group] = groupNotifications([
      row({ kind: 'cheer', group_key: 'cheer:c1', payload: { type: 'fire' } }),
      row({ kind: 'cheer', group_key: 'cheer:c1', payload: { type: 'clap' } }),
    ]);
    expect(pushMessage(group, names)).toMatchObject({ body: '2 עידודים על האימון שלך', url: '/cheers' });
  });

  it('sends a nudge as 🤏 unless it has a note', () => {
    const [emoji] = groupNotifications([
      row({ kind: 'nudge', group_key: 'nudge:s', payload: { sender_name: 'נועה' } }),
    ]);
    expect(pushMessage(emoji, names)).toMatchObject({ title: 'נועה', body: '🤏' });
  });

  it('keeps the evening reminder friendly', () => {
    const [group] = groupNotifications([row({ kind: 'plan_missed', group_key: 'plan_missed', language: 'en' })]);
    expect(pushMessage(group, names)).toMatchObject({
      body: 'Today’s workout isn’t logged yet. Log it now?',
      url: '/log',
    });
  });
});
