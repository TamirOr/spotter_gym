-- The consistency board: % of own locked plan, capped per week, ties share a rank, small plans unranked.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.user('Eitan') as eitan \gset
select test.user('Outsider') as outsider \gset
select test.clique('Morning', array[:'noa', :'yoav', :'maya', :'eitan']::uuid[]) as clique \gset

-- Helpers for this file: a weekly plan made long ago, and a Done on a given day.
create function pg_temp.plan(p_user uuid, p_days text) returns void language sql as $$
  insert into public.plan_items (user_id, activity_id, rrule, starts_on, created_at)
  values (p_user, test.activity('Gym'), 'FREQ=WEEKLY;BYDAY=' || p_days, '2026-01-04', '2026-01-01')
$$;
create function pg_temp.done(p_user uuid, p_day date) returns void language sql as $$
  insert into public.checkins (id, user_id, activity_id, state, started_at, ended_at, local_day)
  values (gen_random_uuid(), p_user, test.activity('Running'), 'done', p_day + time '08:00', p_day + time '09:00', p_day)
$$;

-- The week of Sunday 2026-11-01.
select pg_temp.plan(:'noa', 'SU,TU,TH,SA');
select pg_temp.done(:'noa', '2026-11-01');
select pg_temp.done(:'noa', '2026-11-02');
select pg_temp.done(:'noa', '2026-11-03');

select pg_temp.plan(:'yoav', 'MO,WE');
select pg_temp.done(:'yoav', '2026-11-02');
select pg_temp.done(:'yoav', '2026-11-04');
select pg_temp.done(:'yoav', '2026-11-05');

select pg_temp.plan(:'maya', 'MO,TU,WE,TH');
select pg_temp.done(:'maya', '2026-11-02');
select pg_temp.done(:'maya', '2026-11-03');
select pg_temp.done(:'maya', '2026-11-04');

select pg_temp.plan(:'eitan', 'MO');
select pg_temp.done(:'eitan', '2026-11-02');

select test.eq(
  (select row(planned, completed)::text from public.consistency(:'noa', '2026-11-01', '2026-11-07')),
  '(4,3)', 'an unplanned workout fills a missed slot'
);
select test.eq(
  (select row(planned, completed)::text from public.consistency(:'yoav', '2026-11-01', '2026-11-07')),
  '(2,2)', 'extra workouts do not push past 100%'
);
select test.eq(
  (select row(planned, completed)::text from public.consistency(:'yoav', '2026-10-25', '2026-11-07')),
  '(4,2)', 'a big week does not cover a missed one'
);

-- The board always shows the clique's current week, so move the fixture into it.
update public.checkins set local_day = local_day + (public.week_start(current_date) - date '2026-11-01');

set role authenticated;
select test.login(:'noa');
select test.eq(
  (select array_agg(row(full_name, rank)::text order by full_name) from public.clique_leaderboard(:'clique')),
  array['(Eitan,)', '(Maya,2)', '(Noa,2)', '(Yoav,1)'],
  'ranks by % of own plan; ties share a rank; fewer than 2 planned workouts is unranked'
);

reset role;
update public.profiles set paused_until = 'infinity' where id = :'yoav';
set role authenticated;
select test.login(:'noa');
select test.eq((select rank from public.clique_leaderboard(:'clique') where full_name = 'Yoav'), null::integer, 'a paused user is left out of the ranking');
select test.eq((select rank from public.clique_leaderboard(:'clique') where full_name = 'Noa'), 1, 'the others move up');
select test.eq((select count(*) from public.clique_leaderboard(:'clique', 'month'))::integer, 4, 'there is a monthly board too');
select test.eq((select count(*) from public.clique_leaderboard(:'clique', 'week', 1))::integer, 4, 'last week stays visible');

-- should fail
select test.login(:'outsider');
select test.eq((select count(*) from public.clique_leaderboard(:'clique'))::integer, 0, 'non-members see no board');
select test.eq((select count(*) from public.clique_leaderboard(:'clique', 'year'))::integer, 0, 'unknown periods return nothing');

rollback;
