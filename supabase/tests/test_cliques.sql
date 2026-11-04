-- Clique membership: invites need a friend and acceptance, 20 members at most, owners hand over.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.user('Stranger') as stranger \gset
select test.befriend(:'noa', :'yoav');
select test.befriend(:'noa', :'maya');

set role authenticated;
select test.login(:'noa');
insert into public.cliques (name) values ('Morning') returning id as clique \gset
select test.eq((select role from public.clique_members where user_id = :'noa'), 'owner'::public.clique_role, 'the creator owns the clique');

select public.invite_to_clique(:'clique', :'yoav');
select test.fails($$select public.invite_to_clique('$$ || :'clique' || $$', '$$ || :'stranger' || $$')$$, 'not_friends', 'only friends can be invited');

select test.login(:'yoav');
select test.eq((select name from public.cliques), 'Morning', 'an invitee sees the clique');
select test.ok(not public.shares_clique(:'noa'), 'an invitee is not a member yet');
select public.respond_clique_invite(:'clique', true);
select test.ok(public.shares_clique(:'noa'), 'accepting makes a member');
select test.eq((select count(*) from public.clique_members)::integer, 2, 'members see each other');
update public.clique_members set muted = true where user_id = :'yoav';
select test.eq((select muted from public.clique_members where user_id = :'yoav'), true, 'members mute a clique for themselves');

-- should fail
select test.fails($$update public.clique_members set role = 'owner'$$, 'permission denied', 'roles change only through RPCs');
select test.fails($$select public.remove_clique_member('$$ || :'clique' || $$', '$$ || :'noa' || $$')$$, 'not_allowed', 'only the owner removes members');
update public.cliques set name = 'Mine';
update public.clique_members set muted = true where user_id = :'noa';
select test.login(:'stranger');
select test.eq((select count(*) from public.cliques)::integer, 0, 'outsiders do not see the clique');
select test.fails($$select public.respond_clique_invite('$$ || :'clique' || $$', true)$$, 'not_found', 'nobody joins uninvited');

reset role;
select test.eq((select name from public.cliques where id = :'clique'), 'Morning', 'only the owner renames the clique');
select test.eq((select muted from public.clique_members where user_id = :'noa'), false, 'nobody mutes for someone else');

-- Capacity: 20 active members.
insert into public.clique_members (clique_id, user_id, status, joined_at)
select :'clique', test.user('Filler ' || n), 'active', now() from generate_series(1, 18) as n;
set role authenticated;
select test.login(:'noa');
select test.fails($$select public.invite_to_clique('$$ || :'clique' || $$', '$$ || :'maya' || $$')$$, 'clique_full', 'a clique has at most 20 members');

-- Owner hand-over and leaving.
select public.transfer_clique_ownership(:'clique', :'yoav');
select test.eq((select owner_id from public.cliques), :'yoav'::uuid, 'ownership moves');
select public.leave_clique(:'clique');
select test.eq((select count(*) from public.cliques)::integer, 0, 'someone who leaves no longer sees the clique');
select test.login(:'yoav');
select public.remove_clique_member(:'clique', (select user_id from public.clique_members where role = 'member' and status = 'active' limit 1));
select test.eq((select count(*) from public.clique_members where status = 'active')::integer, 18, 'the owner removes members');
select public.leave_clique(:'clique');
reset role;
select test.ok((select owner_id from public.cliques where id = :'clique') <> :'yoav', 'a leaving owner hands over to the next member');

rollback;
