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

select public.update_goal(:'goal', 5, 'week', 'shared') as revised \gset
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
select test.eq((select previous_id from public.goals where id = :'revised'), :'goal'::uuid, 'the new version points back');
select test.eq((select count(*) from public.goal_progress())::integer, 1, 'only the version in effect has progress');

-- Editing again replaces the pending version instead of adding another.
select public.update_goal(:'goal', 6, 'week', 'private', date :'this_week' + 60) as replaced \gset
select test.eq((select count(*) from public.goals)::integer, 2, 'one pending version at a time');
select test.eq((select target from public.goals where id = :'replaced'), 6::numeric, 'the pending version has the new target');
select test.eq((select ends_on from public.goals where id = :'replaced'), date :'this_week' + 60, 'the end date carries to the new version');
select test.eq((select visibility from public.goals where id = :'goal'), 'private'::public.goal_visibility, 'visibility applies at once');

-- Back to the current target: the pending version goes, and the end date applies to the goal itself.
select test.eq(public.update_goal(:'goal', 3, 'week', 'shared', date :'today' + 10), :'goal'::uuid, 'no change, no new version');
select test.eq((select count(*) from public.goals)::integer, 1, 'the pending version is gone');
select test.eq((select ends_on from public.goals where id = :'goal'), date :'today' + 10, 'the end date applies at once');

-- A version that has not started yet is edited in place.
select public.update_goal(:'goal', 5, 'week', 'shared') as revised \gset
select test.eq(public.update_goal(:'revised', 7, 'week', 'shared'), :'revised'::uuid, 'a future version changes in place');
select test.eq((select target from public.goals where id = :'revised'), 7::numeric, 'with the new target');

-- Deleting a goal deletes the versions that follow it.
delete from public.goals where id = :'goal';
select test.eq((select count(*) from public.goals)::integer, 0, 'deleting a goal deletes its next version');

-- should fail
select test.fails($$insert into public.goals (activity_id, target) values (test.activity('Gym'), 0)$$, 'check', 'targets are positive');
select test.fails($$insert into public.goals (user_id, activity_id, target) values (gen_random_uuid(), test.activity('Gym'), 1)$$, 'permission denied', 'goals belong to their creator');
insert into public.goals (activity_id, target) values (test.activity('Gym'), 2) returning id as other \gset
select test.fails($$select public.update_goal('$$ || :'other' || $$', 2, 'week', 'shared', current_date - 1)$$, 'invalid_end_date', 'a goal cannot end in the past');
select test.fails($$update public.goals set previous_id = null$$, 'permission denied', 'versions are linked only by update_goal');

reset role;
select test.user('Yoav') as yoav \gset
set role authenticated;
select test.login(:'yoav');
select test.fails($$select public.update_goal('$$ || :'other' || $$', 1, 'week', 'shared')$$, 'not_found', 'nobody else edits my goal');

rollback;
