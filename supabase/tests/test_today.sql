-- The Today screen: friend lines in order, and my own bar's facts.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.user('Eitan') as eitan \gset
select test.user('Outsider') as outsider \gset
select test.clique('Morning', array[:'noa', :'yoav', :'maya', :'eitan']::uuid[]) as clique \gset

insert into public.plan_items (user_id, activity_id, starts_on, time) values
  (:'noa', test.activity('Gym'), public.local_day(:'noa'), '18:00'),
  (:'eitan', test.activity('Boxing'), public.local_day(:'eitan'), '19:30');

set role authenticated;
select test.login(:'yoav');
select public.mark_going(gen_random_uuid(), test.activity('Boxing'));
select test.login(:'maya');
select public.mark_done(gen_random_uuid(), test.activity('Running'));

select test.login(:'noa');
select test.eq(
  (select array_agg(full_name || ':' || status order by ordinality) from public.clique_today(:'clique') with ordinality),
  array['Yoav:training', 'Maya:done', 'Eitan:planned'],
  'training first, then done, then planned'
);
select test.eq((select planned_time from public.clique_today(:'clique') where user_id = :'eitan'), '19:30'::time, 'a planned friend shows the time');
select test.eq((select activity_id from public.clique_today(:'clique') where user_id = :'yoav'), test.activity('Boxing'), 'a training friend shows the activity');

select test.eq((select planned_activity_id from public.my_today()), test.activity('Gym'), 'my bar shows today''s plan');
select test.eq((select friends_training from public.my_today()), 1, 'my bar counts friends training');
select test.eq((select going_checkin_id from public.my_today()), null::uuid, 'no Going yet');

select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as going \gset
select test.eq((select going_checkin_id from public.my_today()), :'going'::uuid, 'my bar shows the Going');
select public.mark_done(:'going', test.activity('Gym'));
select test.eq((select planned_activity_id from public.my_today()), null::uuid, 'a done plan leaves the bar');
select test.eq((select done_checkin_id from public.my_today()), :'going'::uuid, 'my bar shows the logged workout');

select test.login(:'yoav');
insert into public.reactions (checkin_id, type) values (:'going', 'trophy');
select test.login(:'noa');
select test.eq((select cheer_count from public.my_today()), 1, 'my bar counts cheers');

-- should fail
select test.login(:'outsider');
select test.eq((select count(*) from public.clique_today(:'clique'))::integer, 0, 'outsiders see no friend lines');

rollback;
