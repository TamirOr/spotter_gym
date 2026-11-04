-- Goals: editing applies from the next period, and progress comes from check-ins.
begin;

select test.user('Noa') as noa \gset
select public.local_day(:'noa') as today, public.week_start(public.local_day(:'noa')) as this_week \gset
set role authenticated;
select test.login(:'noa');

insert into public.goals (activity_id, target, period, starts_on)
values (test.activity('Gym'), 3, 'week', date :'today' - 30)
returning id as goal \gset

select public.mark_done(gen_random_uuid(), test.activity('Gym'));
select public.mark_done(gen_random_uuid(), test.activity('Running'));
select test.eq((select progress from public.goal_progress() where goal_id = :'goal'), 1::numeric, 'progress counts Done check-ins of the goal''s activity');

select (public.revise_goal(:'goal', 5, 'week')).id as revised \gset
select test.eq((select target from public.goals where id = :'goal'), 3::numeric, 'the old version keeps its target');
select test.eq(
  (select ends_on from public.goals where id = :'goal'),
  date :'this_week' + 6,
  'the old version ends with the current period'
);
select test.eq(
  (select starts_on from public.goals where id = :'revised'),
  date :'this_week' + 7,
  'the new version starts next period'
);
select test.eq((select count(*) from public.goal_progress())::integer, 1, 'only the version in effect has progress');

-- A version that has not started yet is edited in place.
select test.eq((public.revise_goal(:'revised', 6, 'week')).id, :'revised'::uuid, 'a future version changes in place');

-- should fail
select test.fails($$insert into public.goals (activity_id, target) values (test.activity('Gym'), 0)$$, 'check', 'targets are positive');
select test.fails($$insert into public.goals (user_id, activity_id, target) values (gen_random_uuid(), test.activity('Gym'), 1)$$, 'permission denied', 'goals belong to their creator');

reset role;
select test.user('Yoav') as yoav \gset
set role authenticated;
select test.login(:'yoav');
select test.fails($$select public.revise_goal('$$ || :'goal' || $$', 1, 'week')$$, 'not_found', 'nobody else revises my goal');

rollback;
