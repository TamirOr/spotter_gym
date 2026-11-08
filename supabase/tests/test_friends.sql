-- Friends, signing up and account deletion.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.clique('Morning', array[:'noa', :'yoav']::uuid[]) as clique \gset

set role authenticated;

-- Search: partial name from 2 characters, or exact email.
select test.login(:'noa');
select test.eq((select array_agg(full_name) from public.search_profiles('no')), null::text[], 'my own name is not a result');
select test.eq((select full_name from public.search_profiles('yo')), 'Yoav', 'partial name match');
select test.eq((select full_name from public.search_profiles('MAYA@example.com')), 'Maya', 'exact email match ignores case');
select test.eq((select count(*) from public.search_profiles('maya@example'))::integer, 0, 'partial emails do not match');
select test.eq((select count(*) from public.search_profiles('y'))::integer, 0, 'one character is too short');

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

-- Signing up with an email code creates the profile, which waits for an admin (see test_admin.sql).
reset role;
insert into auth.users (email) values ('fresh@example.com') returning id as fresh \gset
set role authenticated;
select test.login(:'fresh');
select test.eq((public.get_my_profile()).email, 'fresh@example.com', 'signing up creates the profile');
select test.eq((public.get_my_profile()).full_name, '', 'the name is asked for while waiting');
select test.fails($$insert into public.cliques (name) values ('Too early')$$, 'row-level security', 'a waiting user cannot create a clique');
reset role;
update public.profiles set approval = 'approved' where id = :'fresh';
set role authenticated;
select test.eq(public.request_friend(:'yoav'), 'request_sent', 'an approved user can add friends straight away');
insert into public.cliques (name) values ('Fresh start');
select test.eq((select count(*) from public.cliques where name = 'Fresh start')::integer, 1, 'an approved user can create a clique');

-- Deleting an account hands the clique over and keeps sent cheers anonymous.
select test.login(:'noa');
select public.delete_my_account();
reset role;
select test.eq((select count(*) from public.profiles where id = :'noa')::integer, 0, 'the account and its data are gone');
select test.eq((select owner_id from public.cliques where id = :'clique'), :'yoav'::uuid, 'the clique passes to the next member');

rollback;
