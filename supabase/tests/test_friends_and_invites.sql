-- Friends, invite codes and account deletion.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.user('Newcomer', p_joined => false) as newcomer \gset
select test.clique('Morning', array[:'noa']::uuid[]) as clique \gset

set role authenticated;

-- Search: partial name from 2 characters, or exact email.
select test.login(:'noa');
select test.eq((select array_agg(full_name) from public.search_profiles('no')), null::text[], 'my own name is not a result');
select test.eq((select full_name from public.search_profiles('yo')), 'Yoav', 'partial name match');
select test.eq((select full_name from public.search_profiles('MAYA@example.com')), 'Maya', 'exact email match ignores case');
select test.eq((select count(*) from public.search_profiles('maya@example'))::integer, 0, 'partial emails do not match');
select test.eq((select count(*) from public.search_profiles('y'))::integer, 0, 'one character is too short');
select test.eq((select count(*) from public.search_profiles('newcomer'))::integer, 0, 'people who have not joined are hidden');

-- Requests need acceptance; then the friendship is symmetric.
select test.eq(public.request_friend(:'yoav'), 'request_sent', 'Noa asks Yoav');
select test.eq(public.request_friend(:'yoav'), 'request_sent', 'asking again changes nothing');
select test.login(:'yoav');
select test.eq((select friendship from public.search_profiles('noa')), 'request_received', 'Yoav sees the request');
select test.eq((select full_name from public.profiles where id = :'noa'), 'Noa', 'Yoav sees who asked');
select test.eq(public.request_friend(:'noa'), 'friends', 'asking back accepts');
select test.login(:'noa');
select test.eq((select friendship from public.search_profiles('yoav')), 'friends', 'friends both ways');

-- Remove, decline and block.
select public.request_friend(:'maya');
select test.login(:'maya');
select public.decline_friend_request(:'noa');
select test.login(:'noa');
select test.eq((select friendship from public.search_profiles('maya')), 'none', 'a declined request is gone');
select public.remove_friendship(:'yoav');
select test.eq((select friendship from public.search_profiles('yoav')), 'none', 'removing a friend ends it for both');

select test.login(:'maya');
select public.block_user(:'noa');
select test.login(:'noa');
select test.eq((select count(*) from public.search_profiles('maya'))::integer, 0, 'a blocked person cannot find the blocker');
select test.eq((select count(*) from public.friendships)::integer, 0, 'the blocked person never sees the block');
select test.fails($$select public.request_friend('$$ || :'maya' || $$')$$, 'not_found', 'a block looks like an unknown user');
select public.remove_friendship(:'maya');
select test.login(:'maya');
select test.eq((select status from public.friendships), 'blocked'::public.friendship_status, 'only the blocker lifts a block');

-- Invite codes: the newcomer joins, befriends the inviter and joins the clique.
select test.login(:'noa');
select public.create_invite(:'clique') as code \gset
select test.ok(:'code' ~ '^[A-HJ-NP-Z2-9]{6}$', 'codes have 6 characters without look-alikes');

select test.login(:'newcomer');
select test.fails($$select public.create_invite()$$, 'not_joined', 'people who have not joined cannot invite');
select test.fails($$select public.request_friend('$$ || :'noa' || $$')$$, 'not_joined', 'people who have not joined cannot add friends');
select test.fails($$insert into public.cliques (name) values ('Mine')$$, 'row-level security', 'people who have not joined cannot create cliques');
select test.fails($$select public.redeem_invite('ZZZZZZ')$$, 'invalid_invite', 'unknown codes are rejected');
select test.eq(public.redeem_invite(lower(:'code') || ' '), :'clique'::uuid, 'a valid code joins, ignoring case and spaces');
select test.eq(public.redeem_invite(:'code'), :'clique'::uuid, 'redeeming twice is harmless');
select test.ok((public.get_my_profile()).joined_at is not null, 'the newcomer has joined');
select test.eq((select friendship from public.search_profiles('noa')), 'friends', 'the inviter is a friend straight away');
select test.ok(public.shares_clique(:'noa'), 'the newcomer is in the clique');

select test.login(:'maya');
select test.fails($$select public.redeem_invite('$$ || :'code' || $$')$$, 'invalid_invite', 'a code works once');
select test.login(:'noa');
select public.create_invite() as own_code \gset
select test.fails($$select public.redeem_invite('$$ || :'own_code' || $$')$$, 'invalid_invite', 'nobody redeems their own code');
reset role;
update public.invites set expires_at = now() - interval '1 minute' where code = :'own_code';
set role authenticated;
select test.login(:'maya');
select test.fails($$select public.redeem_invite('$$ || :'own_code' || $$')$$, 'invalid_invite', 'expired codes are rejected');
select test.eq((select count(*) from public.invites)::integer, 0, 'invites are visible to their creator only');

-- Deleting an account hands the clique over and keeps sent cheers anonymous.
select test.login(:'noa');
select public.delete_my_account();
reset role;
select test.eq((select count(*) from public.profiles where id = :'noa')::integer, 0, 'the account and its data are gone');
select test.eq((select owner_id from public.cliques where id = :'clique'), :'newcomer'::uuid, 'the clique passes to the next member');

rollback;
