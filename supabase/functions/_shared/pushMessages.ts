// Turns claimed outbox rows into web pushes: one push per recipient and group, in their language.
// Push text stays short and free of sensitive detail, because it passes through Apple's push service.
// Shared by the push-dispatch Edge Function and its tests. Keep imports to sibling modules only.

import { cheerText, NUDGE_EMOJI, type Language, type ReactionType } from './cheers.ts';

export type NotificationKind =
  | 'going'
  | 'done'
  | 'cheer'
  | 'friend_invite'
  | 'clique_invite'
  | 'plan_reminder'
  | 'plan_missed'
  | 'nudge'
  | 'signup_pending'
  | 'account_approved';

/** A row returned by public.claim_due_notifications(). */
export type ClaimedNotification = {
  id: number;
  recipient_id: string;
  language: Language;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  group_key: string;
};

export type NotificationGroup = {
  recipientId: string;
  language: Language;
  kind: NotificationKind;
  /** Oldest first. */
  notifications: ClaimedNotification[];
};

export type PushMessage = { title: string; body: string; url: string; tag: string };

/** Activity names by id, in both languages. */
export type ActivityNames = Map<string, Record<Language, string>>;

export function groupNotifications(rows: ClaimedNotification[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  for (const row of rows) {
    const key = `${row.recipient_id}|${row.group_key}`;
    const group = groups.get(key) ?? {
      recipientId: row.recipient_id,
      language: row.language,
      kind: row.kind,
      notifications: [],
    };
    group.notifications.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Every activity id the groups mention, so names can be fetched in one query. */
export function activityIdsIn(groups: NotificationGroup[]): string[] {
  const ids = groups.flatMap((group) => group.notifications.map((row) => text(row.payload.activity_id)));
  return [...new Set(ids.filter(Boolean))];
}

type Copy = { [L in Language]: string };

const APP_NAME = 'Spotter';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function pick(copy: Copy, language: Language): string {
  return copy[language];
}

function distinctNames(group: NotificationGroup, field: string): string[] {
  return [...new Set(group.notifications.map((row) => text(row.payload[field])).filter(Boolean))];
}

function activityName(names: ActivityNames, payload: Record<string, unknown>, language: Language): string {
  return names.get(text(payload.activity_id))?.[language] ?? '';
}

function workoutMessage(group: NotificationGroup, names: ActivityNames): PushMessage {
  const { language, kind } = group;
  const latest = group.notifications.at(-1)!;
  const people = distinctNames(group, 'actor_name');

  if (people.length > 1) {
    return {
      title: APP_NAME,
      body: pick(
        { he: `${people.length} חברים מתאמנים עכשיו`, en: `${people.length} friends are training now` },
        language,
      ),
      url: '/',
      tag: kind,
    };
  }

  const actor = text(latest.payload.actor_name);
  const activity = activityName(names, latest.payload, language);
  const body =
    kind === 'going'
      ? pick({ he: `בדרך ל${activity || 'אימון'}`, en: `Going to ${activity || 'a workout'}` }, language)
      : pick(
          { he: `האימון הושלם${activity ? `: ${activity}` : ''}`, en: `Finished ${activity || 'a workout'}` },
          language,
        );
  return {
    title: actor,
    body: `${body}. ${pick({ he: 'לעודד?', en: 'Send a cheer?' }, language)}`,
    url: `/cheer/${text(latest.payload.checkin_id)}`,
    tag: `${kind}:${text(latest.payload.checkin_id)}`,
  };
}

function cheerMessage(group: NotificationGroup): PushMessage {
  const { language } = group;
  const latest = group.notifications.at(-1)!;
  const tag = `cheer:${text(latest.payload.checkin_id)}`;

  if (group.notifications.length > 1) {
    const count = group.notifications.length;
    return {
      title: APP_NAME,
      body: pick({ he: `${count} עידודים על האימון שלך`, en: `${count} cheers on your workout` }, language),
      url: '/cheers',
      tag,
    };
  }

  const type = text(latest.payload.type) as ReactionType;
  // A friend's own note is sent as they wrote it.
  const body = type === 'note' ? text(latest.payload.body) : cheerText(type, language);
  return { title: text(latest.payload.sender_name) || APP_NAME, body, url: '/cheers', tag };
}

export function pushMessage(group: NotificationGroup, names: ActivityNames): PushMessage {
  const { language } = group;
  const latest = group.notifications.at(-1)!;
  const sender = text(latest.payload.sender_name);

  switch (group.kind) {
    case 'going':
    case 'done':
      return workoutMessage(group, names);
    case 'cheer':
      return cheerMessage(group);
    case 'nudge':
      return {
        title: sender || APP_NAME,
        body: text(latest.payload.body) || NUDGE_EMOJI,
        url: '/',
        tag: group.notifications[0].group_key,
      };
    case 'friend_invite':
      return {
        title: APP_NAME,
        body: pick({ he: `בקשת חברות מ${sender}`, en: `Friend request from ${sender}` }, language),
        url: '/friends',
        tag: 'friend_invite',
      };
    case 'clique_invite':
      return {
        title: APP_NAME,
        body: pick(
          {
            he: `הזמנה לקליקה ${text(latest.payload.clique_name)}`,
            en: `Invite to ${text(latest.payload.clique_name)}`,
          },
          language,
        ),
        url: '/clique',
        tag: group.notifications[0].group_key,
      };
    case 'plan_reminder': {
      const activity = activityName(names, latest.payload, language);
      const time = text(latest.payload.time).slice(0, 5);
      return {
        title: APP_NAME,
        body: pick({ he: `בקרוב: ${activity} ב-${time}`, en: `Coming up: ${activity} at ${time}` }, language),
        url: '/',
        tag: 'plan_reminder',
      };
    }
    case 'plan_missed':
      return {
        title: APP_NAME,
        body: pick(
          { he: 'האימון של היום עוד לא נרשם. לרשום עכשיו?', en: 'Today’s workout isn’t logged yet. Log it now?' },
          language,
        ),
        url: '/log',
        tag: 'plan_missed',
      };
    case 'signup_pending': {
      const count = group.notifications.length;
      return {
        title: APP_NAME,
        body:
          count > 1
            ? pick({ he: `${count} בקשות הצטרפות ממתינות`, en: `${count} sign-ups are waiting` }, language)
            : pick({ he: 'בקשת הצטרפות חדשה ממתינה', en: 'A new sign-up is waiting' }, language),
        url: '/admin',
        tag: 'signup_pending',
      };
    }
    case 'account_approved':
      return {
        title: APP_NAME,
        body: pick({ he: 'הבקשה אושרה. אפשר להיכנס', en: 'You’re approved. Come on in' }, language),
        url: '/',
        tag: 'account_approved',
      };
  }
}
