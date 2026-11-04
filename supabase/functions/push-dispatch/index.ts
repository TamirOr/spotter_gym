// Drains the notification outbox and sends web pushes. pg_cron calls it every minute with a shared
// secret (see the platform migration). Logs and responses carry counts only, never names or text.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {
  activityIdsIn,
  groupNotifications,
  pushMessage,
  type ActivityNames,
  type ClaimedNotification,
} from '../_shared/pushMessages.ts';

type Subscription = { id: string; user_id: string; subscription: webpush.PushSubscription };

const GONE_STATUSES = new Set([404, 410]);

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function loadActivityNames(db: SupabaseClient, ids: string[]): Promise<ActivityNames> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db.from('activities').select('id, name, name_he').in('id', ids);
  if (error) throw error;
  return new Map(data.map((row) => [row.id, { en: row.name, he: row.name_he ?? row.name }]));
}

async function loadSubscriptions(db: SupabaseClient, userIds: string[]): Promise<Subscription[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await db
    .from('push_subscriptions')
    .select('id, user_id, subscription')
    .in('user_id', userIds);
  if (error) throw error;
  return data;
}

Deno.serve(async (request) => {
  if (request.headers.get('Authorization') !== `Bearer ${requireEnv('PUSH_DISPATCH_SECRET')}`) {
    return new Response('Forbidden', { status: 403 });
  }

  webpush.setVapidDetails(requireEnv('VAPID_SUBJECT'), requireEnv('VAPID_PUBLIC_KEY'), requireEnv('VAPID_PRIVATE_KEY'));
  const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { data: claimed, error } = await db.rpc('claim_due_notifications');
  if (error) throw error;
  const groups = groupNotifications(claimed as ClaimedNotification[]);
  const [names, subscriptions] = await Promise.all([
    loadActivityNames(db, activityIdsIn(groups)),
    loadSubscriptions(db, [...new Set(groups.map((group) => group.recipientId))]),
  ]);

  const deliveries = groups.flatMap((group) => {
    const message = JSON.stringify(pushMessage(group, names));
    return subscriptions
      .filter((subscription) => subscription.user_id === group.recipientId)
      .map((subscription) => ({ subscription, message }));
  });

  const results = await Promise.allSettled(
    deliveries.map(({ subscription, message }) =>
      webpush.sendNotification(subscription.subscription, message, { TTL: 3600 }),
    ),
  );

  // A device that uninstalled the app or revoked permission answers 404 or 410: forget it.
  const gone = results.flatMap((result, index) =>
    result.status === 'rejected' && GONE_STATUSES.has(result.reason?.statusCode)
      ? [deliveries[index].subscription.id]
      : [],
  );
  if (gone.length > 0) {
    await db.from('push_subscriptions').delete().in('id', gone);
  }

  const summary = {
    claimed: claimed.length,
    pushes: deliveries.length,
    failed: results.filter((result) => result.status === 'rejected').length,
    expired: gone.length,
  };
  console.log(JSON.stringify(summary));
  return Response.json(summary);
});
