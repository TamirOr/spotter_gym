-- Seen receipts: clique members who saw a workout, visible to the athlete only.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Dana') as dana \gset
select test.user('Stranger') as stranger \gset
select test.clique('Crew', array[:'noa', :'yoav', :'dana']::uuid[]) as crew \gset

set role authenticated;
select test.login(:'noa');
select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as going \gset

select test.login(:'yoav');
select public.mark_checkins_seen(array[:'going']::uuid[]);
select public.mark_checkins_seen(array[:'going']::uuid[]);
select test.login(:'dana');
select public.mark_checkins_seen(array[:'going', gen_random_uuid()]::uuid[]);
select test.login(:'stranger');
select public.mark_checkins_seen(array[:'going']::uuid[]);
select test.login(:'noa');
select public.mark_checkins_seen(array[:'going']::uuid[]);

select test.eq((select count(*) from public.checkin_views)::integer, 2, 'the athlete sees each clique member once');
select test.ok(
  not exists (select 1 from public.checkin_views where viewer_id in (:'noa', :'stranger')),
  'the athlete and people outside the clique are not recorded'
);

select test.login(:'yoav');
select test.eq((select count(*) from public.checkin_views)::integer, 1, 'a viewer sees only their own receipt');

-- should fail
select test.fails($$insert into public.checkin_views (checkin_id, viewer_id) values ('$$ || :'going' || $$', '$$ || :'yoav' || $$')$$, 'permission denied', 'receipts are written only through mark_checkins_seen');
select test.fails($$select public.mark_checkins_seen(array(select gen_random_uuid() from generate_series(1, 51)))$$, 'too_many', 'a bounded batch');

reset role;
select test.pending_user('Waiting') as waiting \gset
set role authenticated;
select test.login(:'waiting');
select test.fails($$select public.mark_checkins_seen(array['$$ || :'going' || $$']::uuid[])$$, 'not_approved', 'a waiting user records nothing');

-- Deleting the workout deletes its receipts.
select test.login(:'noa');
select public.cancel_going();
delete from public.checkins where id = :'going';
reset role;
select test.eq((select count(*) from public.checkin_views)::integer, 0, 'receipts go with the workout');

rollback;
