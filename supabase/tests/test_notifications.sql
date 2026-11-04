-- The outbox: who is told, when, and how the dispatcher claims rows.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.user('Eitan') as eitan \gset
select test.clique('Morning', array[:'noa', :'yoav', :'maya']::uuid[]) as morning \gset
select test.clique('Evening', array[:'noa', :'yoav', :'eitan']::uuid[]) as evening \gset

-- Nobody is in quiet hours unless a test says so.
update public.profiles set quiet_hours_start = '00:00', quiet_hours_end = '00:00';
update public.clique_members set muted = true where clique_id = :'evening' and user_id = :'eitan';

set role authenticated;
select test.login(:'noa');
select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as going \gset
reset role;

select test.eq(
  (select array_agg(p.full_name order by p.full_name) from public.notifications n join public.profiles p on p.id = n.recipient_id where n.kind = 'going'),
  array['Maya', 'Yoav'],
  'Going reaches clique-mates once each, and not those who muted the clique'
);

set role authenticated;
select test.login(:'noa');
select public.mark_done(:'going', test.activity('Gym'));
select test.login(:'yoav');
insert into public.reactions (checkin_id, type) values (:'going', 'clap');
insert into public.nudges (recipient_id) values (:'eitan');
reset role;
select test.eq((select count(*) from public.notifications where kind = 'done')::integer, 2, 'Done reaches the clique too');
select test.eq((select group_key from public.notifications where kind = 'cheer'), 'cheer:' || :'going', 'cheers group per check-in');
select test.eq((select recipient_id from public.notifications where kind = 'nudge'), :'eitan'::uuid, 'the nudge reaches only the nudged friend');

-- Muted kinds are never enqueued.
update public.profiles set muted_notification_kinds = '{cheer}' where id = :'noa';
set role authenticated;
select test.login(:'maya');
insert into public.reactions (checkin_id, type) values (:'going', 'fire');
reset role;
select test.eq((select count(*) from public.notifications where kind = 'cheer')::integer, 1, 'a muted type is skipped');

-- Quiet hours hold non-urgent pushes; Going gets through unless turned off.
update public.profiles set quiet_hours_start = '00:00', quiet_hours_end = '23:59:59', time_zone = 'UTC' where id = :'maya';
select test.ok(public.notification_send_time(:'maya', 'nudge') > now(), 'a nudge waits for quiet hours to end');
select test.eq(public.notification_send_time(:'maya', 'going'), now(), 'Going gets through quiet hours by default');
update public.profiles set going_ignores_quiet_hours = false where id = :'maya';
select test.ok(public.notification_send_time(:'maya', 'going') > now(), 'Going can be held too');

-- The dispatcher claims each due row once, with the recipient's language.
update public.profiles set language = 'en' where id = :'yoav';
select test.eq(
  (select language from public.claim_due_notifications() where recipient_id = :'yoav' limit 1),
  'en'::public.app_language,
  'claimed rows carry the recipient''s language'
);
select test.eq((select count(*) from public.claim_due_notifications())::integer, 0, 'a row is claimed once');

-- Reminders: dedupe keys stop a second copy.
select public.enqueue_notification(:'noa', 'plan_missed', '{}', 'plan_missed', 'day-1');
select public.enqueue_notification(:'noa', 'plan_missed', '{}', 'plan_missed', 'day-1');
select test.eq((select count(*) from public.notifications where kind = 'plan_missed')::integer, 1, 'a reminder is enqueued once');

rollback;
