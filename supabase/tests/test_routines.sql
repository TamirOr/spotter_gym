-- Workout routines: times a week, optional days with names, shared with the clique.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Dana') as dana \gset
select test.user('Omer') as omer \gset
select test.befriend(:'noa', :'yoav');
select test.befriend(:'noa', :'omer');
select test.clique('Crew', array[:'noa', :'dana']::uuid[]) as crew \gset

set role authenticated;
select test.login(:'noa');

select public.save_routine(null, test.activity('Gym'), 2, '[]') as gym \gset
select test.eq((select times_per_week from public.routines where id = :'gym'), 2, 'a routine can have no days');
select test.eq((select count(*) from public.routine_days)::integer, 0, 'no days were saved');

select public.save_routine(:'gym', test.activity('Gym'), 3,
  '[{"weekday": "MO", "name": "  Leg day "}, {"weekday": "TH", "name": ""}]');
select test.eq((select times_per_week from public.routines where id = :'gym'), 3, 'times a week can change');
select test.eq(
  (select array_agg(weekday::text || ':' || coalesce(name, '-') order by weekday) from public.routine_days),
  array['MO:Leg day', 'TH:-'],
  'days are saved with trimmed names, and a blank name means none'
);

select public.save_routine(:'gym', test.activity('Gym'), 3, '[{"weekday": "SU"}]');
select test.eq((select array_agg(weekday::text) from public.routine_days), array['SU'], 'saving replaces the days');

select public.save_routine(null, test.activity('Running'), 1, '[]') as running \gset
select test.eq((select count(*) from public.routines)::integer, 2, 'one routine per workout type');
delete from public.routines where id = :'running';
select test.eq((select count(*) from public.routines)::integer, 1, 'a routine can be removed');

-- should fail
select test.fails($$select public.save_routine(null, test.activity('Gym'), 1, '[{"weekday": "SU"}, {"weekday": "MO"}]')$$,
  'routine_days_exceed_times', 'more days than times a week');
select test.fails($$select public.save_routine(null, test.activity('Gym'), 8, '[]')$$,
  'routines_times_per_week_check', 'at most 7 times a week');
select test.fails($$select public.save_routine(null, test.activity('Gym'), 0, '[]')$$,
  'routines_times_per_week_check', 'at least once a week');
select test.fails($$select public.save_routine(null, test.activity('Gym'), 2, '[{"weekday": "SU"}, {"weekday": "SU"}]')$$,
  'routine_days_pkey', 'a day appears once');
select test.fails($$select public.save_routine(null, gen_random_uuid(), 2, '[]')$$, 'unknown_activity', 'the activity must exist');
select test.fails($$insert into public.routines (activity_id, times_per_week) values (test.activity('Gym'), 9)$$,
  'permission denied', 'routines are written only through save_routine');
select test.fails($$insert into public.routine_days (routine_id, weekday) values ('$$ || :'gym' || $$', 'MO')$$,
  'permission denied', 'days are written only through save_routine');

-- A clique mate sees my routine and its days.
select test.login(:'dana');
select test.eq((select array_agg(id) from public.routines), array[:'gym'::uuid], 'clique mates see my routines');
select test.eq((select count(*) from public.routine_days)::integer, 1, 'clique mates see my routine days');
select test.eq(
  (select days from public.clique_routines(:'crew') where routine_id = :'gym'),
  '[{"name": null, "weekday": "SU"}]'::jsonb,
  'the clique screen lists a routine with its days'
);
select test.fails($$select public.save_routine('$$ || :'gym' || $$', test.activity('Gym'), 1, '[]')$$,
  'not_found', 'a clique mate cannot edit my routine');
delete from public.routines where id = :'gym';

-- Being added to the clique is enough: the routine shows as soon as Omer is an active member.
select test.login(:'omer');
select test.eq((select count(*) from public.routines)::integer, 0, 'a friend outside my cliques does not see my routines');
select test.eq((select count(*) from public.clique_routines(:'crew'))::integer, 0, 'only members read the clique''s routines');
reset role;
insert into public.clique_members (clique_id, user_id, status, joined_at) values (:'crew', :'omer', 'active', now());
set role authenticated;
select test.login(:'omer');
select test.eq((select array_agg(id) from public.routines), array[:'gym'::uuid], 'a new member sees my routine');
select public.save_routine(null, test.activity('Gym'), 2, '[]') as omer_gym \gset
select test.login(:'noa');
select test.eq((select count(*) from public.clique_routines(:'crew') where user_id = :'omer')::integer, 1,
  'a new member''s routine shows to the clique');

-- Leaving the clique hides my routines from it again.
reset role;
update public.clique_members set status = 'left' where clique_id = :'crew' and user_id = :'omer';
set role authenticated;
select test.login(:'omer');
select test.eq((select count(*) from public.routines where user_id = :'noa')::integer, 0, 'after leaving, routines are hidden');
select test.eq((select count(*) from public.clique_routines(:'crew'))::integer, 0, 'a former member cannot read the clique''s routines');

select test.login(:'yoav');
select test.eq((select count(*) from public.routines)::integer, 0, 'friends outside my cliques never see my routines');
select test.eq((select count(*) from public.routine_days)::integer, 0, 'friends outside my cliques never see my routine days');
select test.fails($$select public.save_routine('$$ || :'gym' || $$', test.activity('Gym'), 1, '[]')$$,
  'not_found', 'nobody else can edit my routine');
delete from public.routines where id = :'gym';

reset role;
select test.eq((select count(*) from public.routines where id = :'gym')::integer, 1, 'nobody else can remove my routine');

rollback;
