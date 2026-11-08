-- Who can read what: friendship or a shared clique, never more.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Stranger') as stranger \gset
select test.befriend(:'noa', :'yoav');

insert into public.goals (user_id, activity_id, target, visibility) values
  (:'noa', test.activity('Gym'), 4, 'shared'),
  (:'noa', test.activity('Running'), 2, 'private');
insert into public.plan_items (user_id, activity_id) values (:'noa', test.activity('Gym'));
insert into public.places (user_id, name) values (:'noa', 'Home gym');
insert into public.checkins (id, user_id, activity_id, state, ended_at, local_day)
values (gen_random_uuid(), :'noa', test.activity('Gym'), 'done', now(), current_date);
insert into public.notifications (recipient_id, kind, group_key) values (:'noa', 'going', 'going');

set role authenticated;
select test.login(:'noa');
select test.eq((public.get_my_profile()).email, 'noa@example.com', 'I can read my own email');
select test.eq((public.get_my_profile()).nudges_enabled, true, 'I can read my own settings');
update public.profiles set full_name = 'Noa B', quiet_hours_start = '23:00';
select test.eq((public.get_my_profile()).full_name, 'Noa B', 'I can edit my profile');

select test.login(:'yoav');
select test.eq((select full_name from public.profiles where id = :'noa'), 'Noa B', 'friends see my name');
select test.eq((select count(*) from public.goals)::integer, 1, 'friends see shared goals only');
select test.eq((select count(*) from public.checkins)::integer, 1, 'friends see my check-ins');
select test.eq((select count(*) from public.plan_items)::integer, 0, 'friends never see my plan, so a missed plan stays mine');
select test.eq((select count(*) from public.places)::integer, 0, 'places are owner-only');
update public.profiles set full_name = 'hacked' where id = :'noa';
update public.goals set visibility = 'private';

select test.login(:'stranger');
select test.eq((select count(*) from public.profiles where id = :'noa')::integer, 0, 'strangers do not see me');
select test.eq((select count(*) from public.goals)::integer, 0, 'strangers see no goals');
select test.eq((select count(*) from public.checkins)::integer, 0, 'strangers see no check-ins');

-- should fail
select test.fails($$select email from public.profiles$$, 'permission denied', 'nobody reads emails through the table');
select test.fails($$update public.profiles set email = 'x@example.com'$$, 'permission denied', 'email is not editable');
select test.fails($$select * from public.notifications$$, 'permission denied', 'the outbox is server-only');
select test.fails($$select public.claim_due_notifications()$$, 'permission denied', 'only the server dispatches pushes');
select test.fails($$update public.goals set target = 10$$, 'permission denied', 'goal targets change only through revise_goal');

reset role;
select test.eq((select full_name from public.profiles where id = :'noa'), 'Noa B', 'friends cannot edit my profile');
select test.eq((select count(*) from public.goals where visibility = 'shared')::integer, 1, 'friends cannot edit my goals');

-- Anonymous visitors see nothing at all.
set role anon;
select test.fails($$select * from public.profiles$$, 'permission denied', 'anon reads no profiles');
select test.fails($$select * from public.activities$$, 'permission denied', 'anon reads no activities');

rollback;
