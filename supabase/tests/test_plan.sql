-- Recurrence rules and plan occurrences, including skips, moves and the week lock.
begin;

-- 2026-11-01 is a Sunday.
select test.eq(public.week_start('2026-11-04'), '2026-11-01'::date, 'weeks start on Sunday');
select test.eq(public.week_start('2026-11-01'), '2026-11-01'::date, 'a Sunday starts its own week');

select test.ok(public.rrule_occurs_on('FREQ=WEEKLY;BYDAY=SU,WE', '2026-11-01', '2026-11-04'), 'weekly on a listed day');
select test.ok(not public.rrule_occurs_on('FREQ=WEEKLY;BYDAY=SU,WE', '2026-11-01', '2026-11-05'), 'weekly skips other days');
select test.ok(not public.rrule_occurs_on('FREQ=WEEKLY;BYDAY=SU', '2026-11-08', '2026-11-01'), 'nothing before the start date');
select test.ok(public.rrule_occurs_on('FREQ=WEEKLY;INTERVAL=2;BYDAY=TH', '2026-11-05', '2026-11-19'), 'every second Thursday: on');
select test.ok(not public.rrule_occurs_on('FREQ=WEEKLY;INTERVAL=2;BYDAY=TH', '2026-11-05', '2026-11-12'), 'every second Thursday: off');
select test.ok(public.rrule_occurs_on('FREQ=MONTHLY;BYMONTHDAY=15', '2026-11-01', '2026-12-15'), 'monthly on the day');
select test.ok(not public.rrule_occurs_on('FREQ=MONTHLY;BYMONTHDAY=31', '2026-11-01', '2026-11-30'), 'monthly skips short months');
select test.ok(public.rrule_occurs_on(null, '2026-11-03', '2026-11-03'), 'no rule means a single workout');
select test.ok(not public.rrule_occurs_on(null, '2026-11-03', '2026-11-10'), 'a single workout does not repeat');

select test.user('Noa') as noa \gset
set role authenticated;
select test.login(:'noa');

insert into public.plan_items (activity_id, rrule, starts_on, time)
values (test.activity('Gym'), 'FREQ=WEEKLY;BYDAY=SU,TU,TH', '2026-11-01', '18:00')
returning id as gym \gset
insert into public.plan_exceptions (plan_item_id, occurs_on, action) values (:'gym', '2026-11-03', 'skip');
insert into public.plan_exceptions (plan_item_id, occurs_on, action, new_date) values (:'gym', '2026-11-05', 'move', '2026-11-06');

-- should fail
select test.fails($$insert into public.plan_items (activity_id, rrule) values (test.activity('Gym'), 'FREQ=DAILY')$$, 'plan_items_rrule_check', 'unsupported rules are rejected');
select test.fails($$insert into public.plan_exceptions (plan_item_id, occurs_on, action) values ('$$ || :'gym' || $$', '2026-11-08', 'move')$$, 'check', 'a move needs a new date');
select test.fails($$update public.plan_items set rrule = 'FREQ=WEEKLY;BYDAY=MO'$$, 'permission denied', 'the repeat rule never changes in place');
select test.fails($$select * from public.plan_occurrences('$$ || :'noa' || $$', '2026-11-01', '2026-11-07')$$, 'permission denied', 'occurrences are server-only');

-- plan_occurrences is server-only, so the rest runs as the server.
reset role;
select test.eq((select count(*) from public.plan_occurrences(:'noa', '2026-11-01', '2026-11-07') where not skipped)::integer, 2, 'skips are kept but flagged');
select test.eq(
  (select array_agg(occurs_on::text || ':' || skipped order by planned_on) from public.plan_occurrences(:'noa', '2026-11-01', '2026-11-07')),
  array['2026-11-01:false', '2026-11-03:true', '2026-11-06:false'],
  'skip and move change one occurrence without changing the series'
);

-- The week lock: an item added or removed mid-week keeps the count from when the week started.
update public.plan_items set created_at = '2026-10-25' where id = :'gym';
insert into public.plan_items (user_id, activity_id, rrule, starts_on, created_at)
values (:'noa', test.activity('Running'), 'FREQ=WEEKLY;BYDAY=MO', '2026-11-01', '2026-11-02 10:00+02');
select test.eq(
  (select count(*) from public.plan_occurrences(:'noa', '2026-11-01', '2026-11-07', '2026-11-01 00:00+02'))::integer, 3,
  'an item added after the week started does not count that week'
);
update public.plan_items set deleted_at = '2026-11-03 12:00+02' where id = :'gym';
select test.eq(
  (select count(*) from public.plan_occurrences(:'noa', '2026-11-01', '2026-11-07', '2026-11-01 00:00+02'))::integer, 3,
  'an item removed after the week started still counts that week'
);
select test.eq((select count(*) from public.plan_occurrences(:'noa', '2026-11-08', '2026-11-14'))::integer, 1, 'removed items stop next week');

select test.user('Yoav') as yoav \gset
set role authenticated;
select test.login(:'noa');
select test.fails($$select public.remove_plan_item('$$ || :'gym' || $$')$$, 'not_found', 'an item is removed only once');

select test.login(:'yoav');
select test.eq((select count(*) from public.plan_items)::integer, 0, 'nobody else can read my plan');
select test.fails($$select public.remove_plan_item('$$ || :'gym' || $$')$$, 'not_found', 'nobody else can remove my plan');

-- Editing: time and reminder change in place; a new rule replaces the item from now on.
select test.login(:'noa');
insert into public.plan_items (activity_id, rrule, starts_on, time)
values (test.activity('Gym'), 'FREQ=WEEKLY;BYDAY=MO', '2026-11-01', '07:00')
returning id as monday \gset
select test.eq(
  public.edit_plan_item(:'monday', test.activity('Gym'), '08:00', 'FREQ=WEEKLY;BYDAY=MO', '2026-11-01', 15),
  :'monday'::uuid,
  'a new time keeps the item'
);
select test.eq((select time from public.plan_items where id = :'monday'), '08:00'::time, 'with the new time');
select public.edit_plan_item(:'monday', test.activity('Running'), '08:00', 'FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,WE', '2026-11-08', 15) as replaced \gset
select test.ok(:'replaced'::uuid <> :'monday'::uuid, 'a new rule or activity replaces the item');
select test.eq((select count(*) from public.plan_items where deleted_at is null and id in (:'monday', :'replaced'))::integer, 1, 'only the new item stays in the plan');
select test.eq((select rrule from public.plan_items where id = :'replaced'), 'FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,WE', 'every N weeks');
select test.fails($$select public.edit_plan_item('$$ || :'monday' || $$', test.activity('Gym'), null, null, '2026-11-10', null)$$, 'not_found', 'a replaced item cannot be edited');

-- The week grid keeps a Done whose plan item was removed, and says which day a moved workout was planned on.
reset role;
update public.profiles set time_zone = 'UTC' where id = :'noa';
select public.week_start(current_date) as ws \gset
insert into public.plan_items (user_id, activity_id, rrule, starts_on, created_at)
values (:'noa', test.activity('Boxing'), 'FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA', current_date - 7, now() - interval '8 days')
returning id as daily \gset
insert into public.plan_exceptions (plan_item_id, occurs_on, action, new_date)
values (:'daily', public.week_start(current_date) + 1, 'move', public.week_start(current_date) + 2);
set role authenticated;
select test.login(:'noa');
select (public.mark_done(gen_random_uuid(), test.activity('Boxing'), now() - interval '1 day')).id as boxing \gset
select test.eq(
  (select planned_on from public.my_week(current_date) where plan_item_id = :'daily' and day = date :'ws' + 2 order by planned_on limit 1),
  date :'ws' + 1,
  'a moved workout knows the day it was planned on'
);
select public.remove_plan_item(:'daily');
select test.eq(
  (select count(*) from public.my_week(current_date - 1) where checkin_id = :'boxing')::integer, 1,
  'a Done stays on the grid after its plan item is removed'
);

select test.login(:'yoav');
select test.fails($$select public.edit_plan_item('$$ || :'replaced' || $$', test.activity('Gym'), null, null, '2026-11-10', null)$$, 'not_found', 'nobody else edits my plan');

rollback;
