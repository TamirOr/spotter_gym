-- Admins and sign-up approval, as in the battalion logistics app.
-- A new user waits for an admin to approve them and can do nothing else meanwhile. Admins approve or
-- reject sign-ups, add people ahead of time by email, deactivate and delete users, and see support
-- details. Admins see who uses the app, not their workouts: friends' privacy rules still apply to them.

alter table public.profiles
  add column is_admin boolean not null default false,
  add column approval public.approval_status not null default 'pending',
  add column rejection_reason text check (char_length(rejection_reason) <= 200),
  add column approved_at timestamptz,
  -- A deactivated user cannot sign in. Their history stays.
  add column active boolean not null default true;

-- Everyone who signed up before approval existed keeps their access.
update public.profiles set approval = 'approved', approved_at = now();

-- People an admin added ahead of time. Signing in with this email lands in the app already approved,
-- and the row goes away. Read and written only through the admin RPCs below.
create table public.added_users (
  email text primary key check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.added_users enable row level security;

-- Guards ---------------------------------------------------------------------

create function public.is_member_user(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user_id and approval = 'approved' and active)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin and approval = 'approved' and active
  )
$$;

-- Signed in, whatever the approval. Only for what a waiting user may still do.
create function public.require_signed_in() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using message = 'not_authenticated', errcode = '42501';
  end if;
  return auth.uid();
end $$;

-- Every RPC that acts in the app needs an approved, active user.
create or replace function public.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := public.require_signed_in();
begin
  if not public.is_member_user(v_me) then
    raise exception using message = 'not_approved', errcode = '42501';
  end if;
  return v_me;
end $$;

-- For row rules: whether the signed-in user is approved and active.
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member_user(auth.uid())
$$;
grant execute on function public.is_member() to authenticated;

create function public.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception using message = 'admins_only', errcode = '42501';
  end if;
  return auth.uid();
end $$;

-- A waiting or deactivated user sees nobody but themselves.
create or replace function public.can_see(p_other uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p_other = auth.uid()
    or (public.is_member_user(auth.uid()) and (public.are_friends(auth.uid(), p_other) or public.shares_clique(p_other)))
$$;

drop policy cliques_insert on public.cliques;
create policy cliques_insert on public.cliques for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.is_member()));

-- Sign-up --------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_added boolean;
  v_admin uuid;
begin
  delete from public.added_users where email = lower(coalesce(new.email, '')) returning true into v_added;

  insert into public.profiles (id, email, full_name, avatar_url, approval, approved_at)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
    new.raw_user_meta_data ->> 'avatar_url',
    (case when v_added then 'approved' else 'pending' end)::public.approval_status,
    case when v_added then now() end
  );

  if v_added is null then
    -- No name in the push: the new user has not typed one yet, and email stays out of push text.
    for v_admin in select id from public.profiles where is_admin and approval = 'approved' and active loop
      perform public.enqueue_notification(v_admin, 'signup_pending', '{}', 'signup_pending', new.id::text);
    end loop;
  end if;
  return new;
end $$;

-- Waiting and deactivated users ----------------------------------------------

-- Pushes reach approved, active users only.
create or replace function public.enqueue_notification(
  p_recipient_id uuid,
  p_kind public.notification_kind,
  p_payload jsonb,
  p_group_key text,
  p_dedupe_key text default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (recipient_id, kind, payload, group_key, dedupe_key, send_after)
  select p.id, p_kind, p_payload, p_group_key, p_dedupe_key, public.notification_send_time(p.id, p_kind)
  from public.profiles p
  where p.id = p_recipient_id and p.approval = 'approved' and p.active
    and not (p_kind = any (p.muted_notification_kinds))
  on conflict (recipient_id, kind, dedupe_key) do nothing
$$;

-- A waiting user may turn on notifications, so the approval reaches them.
create or replace function public.save_push_subscription(p_subscription jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_signed_in();
  v_endpoint text := p_subscription ->> 'endpoint';
begin
  if v_endpoint is null or v_endpoint !~ '^https://' then
    perform public.fail('invalid_subscription');
  end if;
  insert into public.push_subscriptions (user_id, endpoint, subscription)
  values (v_me, v_endpoint, p_subscription)
  on conflict (endpoint) do update set user_id = v_me, subscription = p_subscription, updated_at = now();
end $$;

-- Server-only: removes a user and everything they own. Cheers they sent stay, from a former member.
create function public.forget_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_clique_id uuid;
begin
  for v_clique_id in select id from public.cliques where owner_id = p_user_id loop
    perform public.hand_over_or_delete_clique(v_clique_id, p_user_id);
  end loop;
  delete from auth.users where id = p_user_id;
end $$;

-- A waiting user may still delete their account.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.forget_user(public.require_signed_in());
end $$;

-- Only approved, active people can be found or befriended.
create or replace function public.search_profiles(p_query text)
returns table (id uuid, full_name text, avatar_url text, friendship text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.avatar_url, public.friendship_status_with(p.id)
  from public.profiles p
  where public.is_member_user(auth.uid())
    and p.id <> auth.uid()
    and p.approval = 'approved' and p.active
    and not public.is_blocked_either_way(p.id)
    and (
      lower(p.email) = lower(btrim(p_query))
      or (
        char_length(btrim(p_query)) >= 2
        and public.normalize_name(p.full_name) like '%' || public.normalize_name(p_query) || '%'
      )
    )
  order by p.full_name
  limit 20
$$;

create or replace function public.request_friend(p_other uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_status text;
begin
  if p_other = v_me or not public.is_member_user(p_other) then
    perform public.fail('not_found');
  end if;

  v_status := public.friendship_status_with(p_other);
  if v_status = 'request_received' then
    update public.friendships set status = 'accepted'
    where user_low = least(v_me, p_other) and user_high = greatest(v_me, p_other);
    return 'friends';
  end if;
  if v_status in ('friends', 'request_sent') then
    return v_status;
  end if;
  if public.is_blocked_either_way(p_other) then
    -- Same answer as an unknown user, so a block is never revealed.
    perform public.fail('not_found');
  end if;

  insert into public.friendships (user_low, user_high, requested_by)
  values (least(v_me, p_other), greatest(v_me, p_other), v_me);
  return 'request_sent';
end $$;

-- Admin reads ----------------------------------------------------------------

-- Everyone who signed up, for the admin screens. No workouts, goals or plans.
create function public.admin_users()
returns table (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  is_admin boolean,
  approval public.approval_status,
  rejection_reason text,
  active boolean,
  created_at timestamptz,
  approved_at timestamptz,
  onboarded_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
  select p.id, p.full_name, p.email, p.avatar_url, p.is_admin, p.approval, p.rejection_reason, p.active,
    p.created_at, p.approved_at, p.onboarded_at, u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end $$;
grant execute on function public.admin_users() to authenticated;

create function public.admin_added_users()
returns table (email text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select a.email, a.created_at from public.added_users a order by a.created_at desc;
end $$;
grant execute on function public.admin_added_users() to authenticated;

-- What support needs to see for one user: their devices and their latest pushes. Ids, kinds and times
-- only; a device is named by its push service's host (Apple, Google, Mozilla).
create function public.admin_user_support(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'push_service', substring(s.endpoint from '^https://([^/]+)'), 'updated_at', s.updated_at
      ) order by s.updated_at desc)
      from public.push_subscriptions s where s.user_id = p_user_id
    ), '[]'),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object('kind', n.kind, 'created_at', n.created_at, 'sent_at', n.sent_at)
        order by n.created_at desc)
      from (
        select kind, created_at, sent_at from public.notifications
        where recipient_id = p_user_id order by created_at desc limit 20
      ) n
    ), '[]'),
    'friends', (
      select count(*) from public.friendships
      where p_user_id in (user_low, user_high) and status = 'accepted'
    ),
    'cliques', (select count(*) from public.clique_members where user_id = p_user_id and status = 'active')
  );
end $$;
grant execute on function public.admin_user_support(uuid) to authenticated;

-- The admin home's status line: pushes waiting to go out, and how late the oldest one is.
-- The dispatcher runs every minute, so a backlog older than a few minutes means pushes are stuck.
create function public.admin_health()
returns table (push_backlog integer, oldest_push_minutes integer, pending_signups integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select
    (select count(*)::integer from public.notifications where sent_at is null and send_after <= now()),
    (select coalesce(floor(extract(epoch from now() - min(send_after)) / 60), 0)::integer
      from public.notifications where sent_at is null and send_after <= now()),
    (select count(*)::integer from public.profiles where approval = 'pending');
end $$;
grant execute on function public.admin_health() to authenticated;

-- Admin actions --------------------------------------------------------------

-- Approves a waiting or rejected user, who gets a push.
create function public.approve_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.profiles set approval = 'approved', rejection_reason = null, approved_at = now()
  where id = p_user_id and approval <> 'approved';
  if found then
    perform public.enqueue_notification(p_user_id, 'account_approved', '{}', 'account_approved');
  end if;
end $$;
grant execute on function public.approve_user(uuid) to authenticated;

create function public.reject_user(p_user_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.profiles set approval = 'rejected', rejection_reason = nullif(btrim(p_reason), '')
  where id = p_user_id and approval = 'pending';
end $$;
grant execute on function public.reject_user(uuid, text) to authenticated;

-- Deactivating also bans the sign-in, so the person cannot get a new session.
create function public.set_user_active(p_user_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- An admin could lock themselves out.
  if public.require_admin() = p_user_id and not p_active then
    perform public.fail('cannot_deactivate_self');
  end if;
  update public.profiles set active = p_active where id = p_user_id;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end
  where id = p_user_id;
end $$;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;

-- Deleting removes the user and their data, unlike deactivating, which keeps their history.
-- Admins are not deleted here, so no admin can remove the others.
create function public.delete_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.require_admin() = p_user_id then
    perform public.fail('cannot_delete_self');
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and is_admin) then
    perform public.fail('cannot_delete_admin');
  end if;
  perform public.forget_user(p_user_id);
end $$;
grant execute on function public.delete_user(uuid) to authenticated;

-- Adds someone ahead of time. Admins are not added this way.
create function public.add_user(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_admin uuid := public.require_admin();
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    perform public.fail('invalid_email');
  end if;
  if exists (select 1 from public.profiles where lower(email) = v_email) then
    perform public.fail('email_taken');
  end if;
  insert into public.added_users (email, added_by) values (v_email, v_admin) on conflict (email) do nothing;
end $$;
grant execute on function public.add_user(text) to authenticated;

create function public.cancel_added_user(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.added_users where email = lower(btrim(p_email));
end $$;
grant execute on function public.cancel_added_user(text) to authenticated;

-- Bootstrap, from the SQL editor only: makes an existing account an admin. Not callable by the app.
-- The person signs in once first, so their account exists.
create function public.promote_admin(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set is_admin = true, approval = 'approved', approved_at = coalesce(approved_at, now()),
    rejection_reason = null, active = true
  where lower(email) = lower(btrim(p_email));
  if not found then
    raise exception 'no account with email %; sign in once first', p_email;
  end if;
  update auth.users set banned_until = null where lower(email) = lower(btrim(p_email));
end $$;
