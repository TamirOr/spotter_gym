-- Cheers go to clique-mates who are training or done; nudges to those who are not, once a day, privately.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.user('Friend only') as friend_only \gset
select test.befriend(:'noa', :'friend_only');
select test.clique('Morning', array[:'noa', :'yoav', :'maya']::uuid[]) as clique \gset

set role authenticated;
select test.login(:'noa');
select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as going \gset

-- Cheers
select test.login(:'yoav');
insert into public.reactions (checkin_id, type) values (:'going', 'fire');
insert into public.reactions (checkin_id, type, body) values (:'going', 'note', '  יאללה נועה!  ');
select test.eq((select body from public.reactions where type = 'note'), 'יאללה נועה!', 'notes are trimmed');
select test.eq((select cheered from public.clique_today(:'clique') where user_id = :'noa'), true, 'the sender sees the cheer was sent');

select test.login(:'noa');
select test.eq((select count(*) from public.reactions)::integer, 2, 'the athlete sees the cheers');
select test.login(:'maya');
select test.eq((select count(*) from public.reactions)::integer, 0, 'other members do not see someone else''s cheers');

-- should fail
select test.login(:'yoav');
select test.fails($$insert into public.reactions (checkin_id, type) values ('$$ || :'going' || $$', 'clap')$$, 'duplicate key', 'one quick cheer per check-in');
select test.fails($$insert into public.reactions (checkin_id, type, body) values ('$$ || :'going' || $$', 'note', repeat('x', 141))$$, 'check', 'notes are at most 140 characters');
select test.fails($$insert into public.reactions (checkin_id, type) values ('$$ || :'going' || $$', 'note')$$, 'check', 'a note needs text');
select test.login(:'noa');
select test.fails($$insert into public.reactions (checkin_id, type) values ('$$ || :'going' || $$', 'muscle')$$, 'row-level security', 'nobody cheers themselves');
select test.login(:'friend_only');
select test.fails($$insert into public.reactions (checkin_id, type) values ('$$ || :'going' || $$', 'muscle')$$, 'row-level security', 'cheers come from clique-mates');

-- Nudges
select test.login(:'yoav');
select test.ok(not public.can_nudge(:'noa'), 'nobody nudges a friend who is training');
select test.ok(public.can_nudge(:'maya'), 'a clique-mate with no workout today can be nudged');
insert into public.nudges (recipient_id) values (:'maya');
select test.eq((select body from public.nudges), null::text, 'an empty nudge is the 🤏 emoji');
select test.eq((select nudged from public.clique_today(:'clique') where user_id = :'maya'), true, 'the sender sees the nudge was sent');

select test.login(:'maya');
select test.eq((select count(*) from public.nudges)::integer, 1, 'the recipient sees the nudge');
select test.login(:'noa');
select test.eq((select count(*) from public.nudges)::integer, 0, 'nudges stay private between the two friends');

-- should fail
select test.login(:'yoav');
select test.fails($$insert into public.nudges (recipient_id, body) values ('$$ || :'maya' || $$', 'again')$$, 'duplicate key', 'one nudge per friend per day');
select test.fails($$insert into public.nudges (recipient_id) values ('$$ || :'noa' || $$')$$, 'row-level security', 'no nudging someone who is training');
select test.fails($$insert into public.nudges (recipient_id) values ('$$ || :'friend_only' || $$')$$, 'row-level security', 'nudges come from clique-mates');

reset role;
update public.profiles set nudges_enabled = false where id = :'maya';
delete from public.nudges;
set role authenticated;
select test.login(:'yoav');
select test.ok(not public.can_nudge(:'maya'), 'nudges can be turned off');
select test.eq((select can_nudge from public.clique_today(:'clique') where user_id = :'maya'), false, 'the nudge button hides when nudges are off');

select test.login(:'noa');
select public.mark_done(:'going', test.activity('Gym'));
select test.login(:'yoav');
select test.ok(not public.can_nudge(:'noa'), 'nobody nudges a friend who already trained today');

rollback;
