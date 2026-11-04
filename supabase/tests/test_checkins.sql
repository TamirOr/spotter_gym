-- Going and Done: idempotent retries, one workout in progress, plan linking and the logging window.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select gen_random_uuid() as going_id, gen_random_uuid() as late_id, gen_random_uuid() as old_id \gset

-- Today's plan, so a Done can link to it.
insert into public.plan_items (user_id, activity_id, starts_on, time)
values (:'noa', test.activity('Gym'), public.local_day(:'noa'), '18:00')
returning id as plan_item \gset

set role authenticated;
select test.login(:'noa');

select test.eq((public.mark_going(:'going_id', test.activity('Gym'))).state, 'going'::public.checkin_state, 'Going starts a workout');
select test.eq((public.mark_going(:'going_id', test.activity('Gym'))).id, :'going_id'::uuid, 'a retried Going returns the same row');
select test.eq((select count(*) from public.checkins)::integer, 1, 'a retry creates no duplicate');

select public.mark_going(gen_random_uuid(), test.activity('Running'));
select test.eq((select state from public.checkins where id = :'going_id'), 'cancelled'::public.checkin_state, 'a new Going replaces the open one');
select test.eq((select count(*) from public.checkins where state = 'going')::integer, 1, 'one workout in progress at a time');

select public.mark_going(:'going_id' , test.activity('Gym'));
select test.fails($$select public.mark_done('$$ || :'going_id' || $$', test.activity('Gym'))$$, 'checkin_cancelled', 'a cancelled Going cannot be finished');

select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as open_id \gset
select test.eq((public.mark_done(:'open_id', test.activity('Gym'), p_note => '  great  ')).state, 'done'::public.checkin_state, 'Done finishes my Going');
select test.eq((select note from public.checkins where id = :'open_id'), 'great', 'notes are trimmed');
select test.eq((select plan_item_id from public.checkins where id = :'open_id'), :'plan_item'::uuid, 'Done links to today''s plan');
select test.eq((public.mark_done(:'open_id', test.activity('Gym'))).id, :'open_id'::uuid, 'a retried Done returns the same row');

select public.mark_done(:'late_id', test.activity('Running'), now() - interval '47 hours', 30);
select test.eq((select duration_min from public.checkins where id = :'late_id'), 30, 'logging 47 hours late works');
select test.eq((select plan_item_id from public.checkins where id = :'late_id'), null::uuid, 'unplanned workouts count without a plan link');

update public.checkins set duration_min = 45, note = 'edited' where id = :'late_id';
select test.eq((select duration_min from public.checkins where id = :'late_id'), 45, 'owners edit their logs');

select public.mark_going(gen_random_uuid(), test.activity('Gym'));
select public.cancel_going();
select test.eq((select count(*) from public.checkins where state = 'going')::integer, 0, '"It didn''t happen" closes the Going');

-- should fail
select test.fails($$select public.mark_done('$$ || :'old_id' || $$', test.activity('Gym'), now() - interval '49 hours')$$, 'outside_logging_window', 'no logging more than 48 hours late');
select test.fails($$select public.mark_done(gen_random_uuid(), test.activity('Gym'), now() + interval '1 hour')$$, 'outside_logging_window', 'no logging in the future');
select test.fails($$update public.checkins set ended_at = now() - interval '3 days' where id = '$$ || :'late_id' || $$'$$, 'outside_logging_window', 'edits stay inside the window');
select test.fails($$update public.checkins set state = 'done'$$, 'permission denied', 'state changes only through RPCs');
select test.fails($$insert into public.checkins (id, activity_id, state, local_day) values (gen_random_uuid(), test.activity('Gym'), 'done', current_date)$$, 'permission denied', 'check-ins are created only through RPCs');

select test.login(:'yoav');
select test.fails($$select public.mark_going('$$ || :'late_id' || $$', test.activity('Gym'))$$, 'checkin_id_taken', 'another user''s id cannot be reused');
select test.fails($$select public.mark_done('$$ || :'late_id' || $$', test.activity('Gym'))$$, 'checkin_id_taken', 'another user''s log cannot be finished');
update public.checkins set note = 'hacked';
delete from public.checkins;
reset role;
select test.eq((select count(*) from public.checkins where note = 'hacked')::integer, 0, 'strangers cannot edit my logs');
select test.eq((select count(*) from public.checkins where user_id = :'noa')::integer, 5, 'strangers cannot delete my logs');

-- A Going older than 4 hours is over: the app asks whether it happened.
update public.checkins set started_at = now() - interval '5 hours' where id = (select id from public.checkins where state = 'cancelled' limit 1);
insert into public.checkins (id, user_id, activity_id, state, started_at, local_day)
values (gen_random_uuid(), :'yoav', test.activity('Gym'), 'going', now() - interval '5 hours', current_date);
set role authenticated;
select test.login(:'yoav');
select test.eq((select going_expired from public.my_today()), true, 'an old Going is reported as expired');

rollback;
