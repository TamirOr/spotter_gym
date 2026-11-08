-- Admins and sign-up approval: a new user waits, admins approve, reject, add, deactivate and delete.
begin;

select test.admin('Dana') as dana \gset
select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.befriend(:'noa', :'yoav');

-- Signing up waits for approval, and admins hear about it.
select test.pending_user('Newbie') as newbie \gset
select test.eq((select approval::text from public.profiles where id = :'newbie'), 'pending', 'a new sign-up waits');
select test.eq(
  (select array_agg(recipient_id) from public.notifications where kind = 'signup_pending' and dedupe_key = :'newbie'),
  array[:'dana'::uuid], 'admins, and only admins, get a push about a new sign-up'
);

set role authenticated;

-- A waiting user sees and does nothing but their own account.
select test.login(:'newbie');
select test.eq((public.get_my_profile()).approval::text, 'pending', 'a waiting user reads their own profile');
update public.profiles set full_name = 'Newbie Cohen' where id = :'newbie';
select test.eq((public.get_my_profile()).full_name, 'Newbie Cohen', 'a waiting user can type their name');
select test.eq((select count(*) from public.search_profiles('Noa'))::integer, 0, 'a waiting user finds nobody');
select public.save_push_subscription('{"endpoint": "https://web.push.apple.com/abc"}');

-- should fail
select test.fails($$select public.request_friend(test.user_id('Noa'))$$, 'not_approved', 'a waiting user cannot add friends');
select test.fails(
  $$select public.mark_going(gen_random_uuid(), test.activity('Gym'))$$, 'not_approved', 'a waiting user cannot check in'
);
select test.fails($$select * from public.admin_users()$$, 'admins_only', 'a waiting user is not an admin');

-- Members cannot find or befriend a waiting user.
select test.login(:'noa');
select test.eq((select count(*) from public.search_profiles('Newbie'))::integer, 0, 'a waiting user is not searchable');
select test.fails($$select public.request_friend(test.user_id('Newbie'))$$, 'not_found', 'nobody befriends a waiting user');

-- should fail: members are not admins.
select test.fails($$select * from public.admin_users()$$, 'admins_only', 'members cannot list users');
select test.fails($$select * from public.admin_added_users()$$, 'admins_only', 'members cannot list added users');
select test.fails($$select * from public.admin_health()$$, 'admins_only', 'members cannot read health');
select test.fails($$select public.admin_user_support(test.user_id('Yoav'))$$, 'admins_only', 'members cannot read support');
select test.fails($$select public.approve_user(test.user_id('Newbie'))$$, 'admins_only', 'members cannot approve');
select test.fails($$select public.reject_user(test.user_id('Newbie'))$$, 'admins_only', 'members cannot reject');
select test.fails($$select public.set_user_active(test.user_id('Yoav'), false)$$, 'admins_only', 'members cannot deactivate');
select test.fails($$select public.delete_user(test.user_id('Yoav'))$$, 'admins_only', 'members cannot delete');
select test.fails($$select public.add_user('x@example.com')$$, 'admins_only', 'members cannot add users');
select test.fails($$update public.profiles set is_admin = true$$, 'permission denied', 'nobody makes themselves admin');
select test.fails($$update public.profiles set approval = 'approved'$$, 'permission denied', 'nobody approves themselves');
select test.fails($$select * from public.added_users$$, 'permission denied', 'added users are read through RPCs only');
select test.fails($$select public.promote_admin('noa@example.com')$$, 'permission denied', 'promoting is SQL-editor only');

-- Admins see everyone, with support details, and approve.
select test.login(:'dana');
select test.eq((select count(*) from public.admin_users())::integer, 4, 'admins list every user');
select test.eq((select pending_signups from public.admin_health()), 1, 'health counts waiting sign-ups');
select test.eq(
  public.admin_user_support(:'newbie') -> 'devices' -> 0 ->> 'push_service', 'web.push.apple.com',
  'support shows the device push service, not the endpoint'
);
select public.approve_user(:'newbie');
select test.eq((select approval::text from public.admin_users() where id = :'newbie'), 'approved', 'admins approve');

select test.login(:'newbie');
select test.eq((select count(*) from public.search_profiles('Noa'))::integer, 1, 'an approved user finds people');

-- Rejecting keeps the reason for the waiting screen.
reset role;
select test.pending_user('Spam') as spam \gset
set role authenticated;
select test.login(:'dana');
select public.reject_user(:'spam', '  not in the group  ');
select test.login(:'spam');
select test.eq((public.get_my_profile()).rejection_reason, 'not in the group', 'the rejected user sees the reason');
select test.fails($$select public.request_friend(test.user_id('Noa'))$$, 'not_approved', 'a rejected user stays out');

-- Deactivating keeps the history but closes the account.
select test.login(:'dana');
select public.set_user_active(:'yoav', false);
select test.fails($$select public.set_user_active(auth.uid(), false)$$, 'cannot_deactivate_self', 'an admin cannot lock themselves out');
select test.fails($$select public.delete_user(auth.uid())$$, 'cannot_delete_self', 'an admin cannot delete themselves');
select test.login(:'yoav');
select test.fails($$select public.mark_going(gen_random_uuid(), test.activity('Gym'))$$, 'not_approved', 'a deactivated user cannot act');
select test.eq((select count(*) from public.profiles where id = test.user_id('Noa'))::integer, 0, 'a deactivated user sees nobody');
select test.login(:'noa');
select test.eq((select count(*) from public.profiles where id = :'yoav')::integer, 1, 'friends still see a deactivated user''s history');

reset role;
select test.eq((select banned_until from auth.users where id = :'yoav'), 'infinity'::timestamptz, 'deactivating bans sign-in');
insert into public.notifications (recipient_id, kind, group_key) values (:'noa', 'going', 'going');
select public.enqueue_notification(:'yoav', 'nudge', '{}', 'nudge');
select test.eq(
  (select count(*) from public.notifications where recipient_id = :'yoav' and kind = 'nudge')::integer, 0,
  'a deactivated user gets no pushes'
);
set role authenticated;
select test.login(:'dana');
select public.set_user_active(:'yoav', true);
reset role;
select test.eq((select banned_until from auth.users where id = :'yoav'), null::timestamptz, 'reactivating lifts the ban');
select test.eq((select count(*) from public.notifications where kind = 'account_approved')::integer, 1, 'approval sends a push');

-- Adding ahead of time: the person lands approved, with no waiting.
set role authenticated;
select test.login(:'dana');
select public.add_user('  Guest@Example.com ');
select test.eq((select email from public.admin_added_users()), 'guest@example.com', 'added users are listed until they sign in');
select test.fails($$select public.add_user('noa@example.com')$$, 'email_taken', 'an email that has a user is refused');
select test.fails($$select public.add_user('not-an-email')$$, 'invalid_email', 'an address must look like one');
select public.add_user('later@example.com');
select public.cancel_added_user('later@example.com');
reset role;
select test.pending_user('Guest') as guest \gset
select test.eq((select approval::text from public.profiles where id = :'guest'), 'approved', 'an added user lands approved');
select test.eq((select count(*) from public.added_users)::integer, 0, 'signing in or cancelling clears the added list');

-- Deleting removes the user; admins cannot be deleted.
select test.admin('Eli') as eli \gset
set role authenticated;
select test.login(:'dana');
select test.fails($$select public.delete_user(test.user_id('Eli'))$$, 'cannot_delete_admin', 'admins are not deleted');
select public.delete_user(:'spam');
reset role;
select test.eq((select count(*) from auth.users where id = :'spam')::integer, 0, 'deleting removes the sign-in too');

-- Bootstrap from the SQL editor.
select public.promote_admin('noa@example.com');
select test.ok((select is_admin from public.profiles where id = :'noa'), 'promote_admin makes an admin');
select test.fails($$select public.promote_admin('nobody@example.com')$$, 'no account', 'promoting needs an account');

rollback;
