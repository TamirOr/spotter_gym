-- Workout routines: times a week, optional days with names, owner only.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.befriend(:'noa', :'yoav');

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

select test.login(:'yoav');
select test.eq((select count(*) from public.routines)::integer, 0, 'friends never see my routines');
select test.eq((select count(*) from public.routine_days)::integer, 0, 'friends never see my routine days');
select test.fails($$select public.save_routine('$$ || :'gym' || $$', test.activity('Gym'), 1, '[]')$$,
  'not_found', 'nobody else can edit my routine');
delete from public.routines where id = :'gym';

reset role;
select test.eq((select count(*) from public.routines where id = :'gym')::integer, 1, 'nobody else can remove my routine');

rollback;
