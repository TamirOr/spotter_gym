-- Business rules: triggers, permission checks used by RLS, and the RPCs the app calls.
-- Trigger functions are security definer so they can use the server-only helpers.
-- Errors are raised with a stable snake_case message that the app maps to translated text.

-- Constants ------------------------------------------------------------------

create function public.clique_capacity() returns integer
language sql immutable set search_path = '' as $$ select 20 $$;

-- A Going with no Done after this long is treated as over, and the app asks whether it happened.
create function public.going_expires_after() returns interval
language sql immutable set search_path = '' as $$ select interval '4 hours' $$;

create function public.late_logging_window() returns interval
language sql immutable set search_path = '' as $$ select interval '48 hours' $$;

-- Small guards ---------------------------------------------------------------

create function public.fail(p_reason text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using message = p_reason, errcode = 'P0001';
end $$;

create function public.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception using message = 'not_authenticated', errcode = '42501';
  end if;
  return auth.uid();
end $$;

-- Sign-up is invite-only while the app is private: social actions need a redeemed invite.
create function public.is_joined() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and joined_at is not null)
$$;

create function public.assert_loggable_at(p_at timestamptz) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_at < now() - public.late_logging_window() or p_at > now() + interval '5 minutes' then
    perform public.fail('outside_logging_window');
  end if;
end $$;

create function public.going_is_active(p_started_at timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select p_started_at > now() - public.going_expires_after()
$$;

-- Profiles -------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The owner's own row, including the columns other users cannot read.
create function public.get_my_profile() returns public.profiles
language sql stable security definer set search_path = '' as $$
  select * from public.profiles where id = auth.uid()
$$;
grant execute on function public.get_my_profile() to authenticated;

-- Activities -----------------------------------------------------------------

create function public.prepare_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.normalized_name := public.normalize_name(new.name);
  -- The Hebrew name is matched like any other alias.
  new.aliases := array(
    select distinct public.normalize_name(alias)
    from unnest(new.aliases || new.name_he) as alias
    where alias is not null
  );
  -- A custom activity must not shadow a preset, or friends would stop adding up on leaderboards.
  if new.owner_id is not null and exists (
    select 1 from public.activities a
    where a.owner_id is null
      and (a.normalized_name = new.normalized_name or new.normalized_name = any (a.aliases))
  ) then
    perform public.fail('activity_exists');
  end if;
  return new;
end $$;

create trigger prepare_activity
  before insert or update of name, name_he, aliases on public.activities
  for each row execute function public.prepare_activity();

-- Finds an existing activity for a typed name: an exact match on name or alias, otherwise the closest
-- similar name so the app can ask "Did you mean Boxing?" before creating anything.
create function public.match_activity(p_name text)
returns table (activity_id uuid, exact boolean)
language sql stable security definer set search_path = '' as $$
  with candidates as (
    select a.id, a.normalized_name, a.aliases
    from public.activities a
    where a.owner_id is null or a.owner_id = auth.uid()
  ),
  query as (select public.normalize_name(p_name) as name)
  (
    select c.id, true
    from candidates c, query q
    where c.normalized_name = q.name or q.name = any (c.aliases)
    limit 1
  )
  union all
  (
    select c.id, false
    from candidates c, query q
    where not exists (select 1 from candidates e where e.normalized_name = q.name or q.name = any (e.aliases))
      and extensions.similarity(c.normalized_name, q.name) >= 0.4
    order by extensions.similarity(c.normalized_name, q.name) desc
    limit 1
  )
$$;
grant execute on function public.match_activity(text) to authenticated;

create function public.assert_activity_usable(p_activity_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.activities
    where id = p_activity_id and (owner_id is null or owner_id = auth.uid())
  ) then
    perform public.fail('unknown_activity');
  end if;
end $$;

-- Goals ----------------------------------------------------------------------

create function public.check_goal_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_activity_usable(new.activity_id);
  return new;
end $$;

create trigger check_goal_activity
  before insert on public.goals
  for each row execute function public.check_goal_activity();

create function public.next_period_start(p_period public.goal_period, p_today date) returns date
language sql immutable set search_path = '' as $$
  select case p_period
    when 'day' then p_today + 1
    when 'week' then public.week_start(p_today) + 7
    when 'month' then (date_trunc('month', p_today) + interval '1 month')::date
  end
$$;

-- Editing a goal applies from the next period, so past results do not change.
create function public.revise_goal(p_goal_id uuid, p_target numeric, p_period public.goal_period)
returns public.goals
language plpgsql security definer set search_path = '' as $$
declare
  v_goal public.goals;
  v_starts date;
begin
  select * into v_goal from public.goals where id = p_goal_id and user_id = public.require_user() for update;
  if not found then
    perform public.fail('not_found');
  end if;

  v_starts := public.next_period_start(p_period, public.local_day(v_goal.user_id));
  if v_goal.starts_on >= v_starts then
    -- Not in effect yet, so nothing in the past depends on it.
    update public.goals set target = p_target, period = p_period where id = p_goal_id returning * into v_goal;
    return v_goal;
  end if;

  update public.goals set ends_on = v_starts - 1 where id = p_goal_id;
  insert into public.goals (user_id, activity_id, metric, target, period, visibility, starts_on, ends_on)
  values (v_goal.user_id, v_goal.activity_id, v_goal.metric, p_target, p_period, v_goal.visibility, v_starts, v_goal.ends_on)
  returning * into v_goal;
  return v_goal;
end $$;
grant execute on function public.revise_goal(uuid, numeric, public.goal_period) to authenticated;

-- Plan -----------------------------------------------------------------------

create function public.check_plan_item_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_activity_usable(new.activity_id);
  return new;
end $$;

create trigger check_plan_item_activity
  before insert on public.plan_items
  for each row execute function public.check_plan_item_activity();

-- Removal keeps the row, because the week it was removed in still counts it (plans lock at week start).
create function public.remove_plan_item(p_plan_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.plan_items set deleted_at = now()
  where id = p_plan_item_id and user_id = public.require_user() and deleted_at is null;
  if not found then
    perform public.fail('not_found');
  end if;
end $$;
grant execute on function public.remove_plan_item(uuid) to authenticated;

-- Check-ins ------------------------------------------------------------------

create function public.prepare_checkin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.local_day := public.local_day(new.user_id, coalesce(new.ended_at, new.started_at));
  return new;
end $$;

create trigger prepare_checkin
  before insert or update on public.checkins
  for each row execute function public.prepare_checkin();

-- Owners may edit their logs, but only within the late-logging window.
create function public.guard_checkin_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ended_at is distinct from old.ended_at then
    perform public.assert_loggable_at(new.ended_at);
  end if;
  if new.activity_id is distinct from old.activity_id then
    perform public.assert_activity_usable(new.activity_id);
  end if;
  return new;
end $$;

create trigger guard_checkin_edit
  before update of ended_at, activity_id on public.checkins
  for each row execute function public.guard_checkin_edit();

-- A Done links to that day's plan automatically: the same activity first, then any open slot.
create function public.matching_plan_item(p_user_id uuid, p_day date, p_activity_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select o.plan_item_id
  from public.plan_occurrences(p_user_id, p_day, p_day) o
  where o.occurs_on = p_day and not o.skipped
    and not exists (
      select 1 from public.checkins c
      where c.plan_item_id = o.plan_item_id and c.local_day = p_day and c.state = 'done'
    )
  order by (o.activity_id = p_activity_id) desc, o.time nulls last
  limit 1
$$;

-- Going: tells the clique before the workout. It does not count as completed.
create function public.mark_going(p_checkin_id uuid, p_activity_id uuid)
returns public.checkins
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_checkin public.checkins;
begin
  select * into v_checkin from public.checkins where id = p_checkin_id;
  if found then
    if v_checkin.user_id <> v_me then
      perform public.fail('checkin_id_taken');
    end if;
    -- A retry of the same request.
    return v_checkin;
  end if;

  perform public.assert_activity_usable(p_activity_id);
  -- Only one workout is in progress at a time; an older open Going is replaced.
  update public.checkins set state = 'cancelled' where user_id = v_me and state = 'going';

  insert into public.checkins (id, user_id, activity_id, state)
  values (p_checkin_id, v_me, p_activity_id, 'going')
  returning * into v_checkin;
  return v_checkin;
end $$;
grant execute on function public.mark_going(uuid, uuid) to authenticated;

-- Done: records the workout. Passing the id of my open Going finishes it; any other id logs a new
-- workout, up to 48 hours late. Retrying with the same id returns the same row.
create function public.mark_done(
  p_checkin_id uuid,
  p_activity_id uuid,
  p_ended_at timestamptz default now(),
  p_duration_min integer default null,
  p_distance_km numeric default null,
  p_note text default null
)
returns public.checkins
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_checkin public.checkins;
  v_note text := nullif(btrim(p_note), '');
begin
  perform public.assert_activity_usable(p_activity_id);
  perform public.assert_loggable_at(p_ended_at);

  select * into v_checkin from public.checkins where id = p_checkin_id for update;
  if found and v_checkin.user_id <> v_me then
    perform public.fail('checkin_id_taken');
  end if;
  if found and v_checkin.state = 'done' then
    return v_checkin;
  end if;
  if found and v_checkin.state = 'cancelled' then
    perform public.fail('checkin_cancelled');
  end if;

  if found then
    update public.checkins set
      state = 'done',
      activity_id = p_activity_id,
      ended_at = p_ended_at,
      duration_min = coalesce(
        p_duration_min,
        case when public.going_is_active(started_at)
          then greatest(1, (extract(epoch from p_ended_at - started_at) / 60)::integer)
        end
      ),
      distance_km = p_distance_km,
      note = v_note
    where id = p_checkin_id
    returning * into v_checkin;
  else
    insert into public.checkins (id, user_id, activity_id, state, started_at, ended_at, duration_min, distance_km, note)
    values (
      p_checkin_id, v_me, p_activity_id, 'done',
      p_ended_at - make_interval(mins => coalesce(p_duration_min, 0)), p_ended_at,
      p_duration_min, p_distance_km, v_note
    )
    returning * into v_checkin;
  end if;

  update public.checkins
  set plan_item_id = public.matching_plan_item(v_me, v_checkin.local_day, p_activity_id)
  where id = v_checkin.id
  returning * into v_checkin;
  return v_checkin;
end $$;
grant execute on function public.mark_done(uuid, uuid, timestamptz, integer, numeric, text) to authenticated;

-- "It didn't happen": closes my open Going without logging anything.
create function public.cancel_going() returns void
language sql security definer set search_path = '' as $$
  update public.checkins set state = 'cancelled' where user_id = public.require_user() and state = 'going'
$$;
grant execute on function public.cancel_going() to authenticated;

-- Cheers and nudges ----------------------------------------------------------

create function public.can_cheer(p_checkin_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.checkins c
    where c.id = p_checkin_id
      and c.user_id <> auth.uid()
      and c.state in ('going', 'done')
      and c.started_at > now() - interval '2 days'
      and public.shares_clique(c.user_id)
  )
$$;
grant execute on function public.can_cheer(uuid) to authenticated;

-- Any clique member can nudge a friend who has no workout in progress or logged today,
-- unless that friend turned nudges off.
create function public.can_nudge(p_recipient_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_recipient_id <> auth.uid()
    and public.shares_clique(p_recipient_id)
    and exists (select 1 from public.profiles p where p.id = p_recipient_id and p.nudges_enabled)
    and not exists (
      select 1 from public.checkins c
      where c.user_id = p_recipient_id
        and (
          (c.state = 'going' and public.going_is_active(c.started_at))
          or (c.state = 'done' and c.local_day = public.local_day(p_recipient_id))
        )
    )
$$;
grant execute on function public.can_nudge(uuid) to authenticated;

create function public.prepare_nudge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.day := public.local_day(new.recipient_id);
  new.body := nullif(btrim(new.body), '');
  return new;
end $$;

create trigger prepare_nudge
  before insert on public.nudges
  for each row execute function public.prepare_nudge();

create function public.prepare_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.body := nullif(btrim(new.body), '');
  return new;
end $$;

create trigger prepare_reaction
  before insert on public.reactions
  for each row execute function public.prepare_reaction();

-- Friends --------------------------------------------------------------------

create function public.friendship_status_with(p_other uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when f.status = 'accepted' then 'friends'
      when f.status = 'pending' and f.requested_by = auth.uid() then 'request_sent'
      when f.status = 'pending' then 'request_received'
      when f.status = 'blocked' and f.requested_by = auth.uid() then 'blocked'
      else 'none'
    end
    from public.friendships f
    where f.user_low = least(auth.uid(), p_other) and f.user_high = greatest(auth.uid(), p_other)
  ), 'none')
$$;

create function public.is_blocked_either_way(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships
    where user_low = least(auth.uid(), p_other) and user_high = greatest(auth.uid(), p_other) and status = 'blocked'
  )
$$;

-- Name: partial match from 2 characters, in either language. Email: exact match only.
create function public.search_profiles(p_query text)
returns table (id uuid, full_name text, avatar_url text, friendship text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.avatar_url, public.friendship_status_with(p.id)
  from public.profiles p
  where public.is_joined()
    and p.id <> auth.uid()
    and p.joined_at is not null
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
grant execute on function public.search_profiles(text) to authenticated;

-- Sends a request, or accepts one the other person already sent.
create function public.request_friend(p_other uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_status text;
begin
  if not public.is_joined() then
    perform public.fail('not_joined');
  end if;
  if p_other = v_me or not exists (select 1 from public.profiles where id = p_other and joined_at is not null) then
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
grant execute on function public.request_friend(uuid) to authenticated;

create function public.decline_friend_request(p_other uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.friendships
  where user_low = least(public.require_user(), p_other) and user_high = greatest(auth.uid(), p_other)
    and status = 'pending' and requested_by = p_other
$$;
grant execute on function public.decline_friend_request(uuid) to authenticated;

-- Removes a friend, cancels my request, or lifts my block. Never lifts the other person's block.
create function public.remove_friendship(p_other uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.friendships
  where user_low = least(public.require_user(), p_other) and user_high = greatest(auth.uid(), p_other)
    and (status <> 'blocked' or requested_by = auth.uid())
$$;
grant execute on function public.remove_friendship(uuid) to authenticated;

create function public.block_user(p_other uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
begin
  if p_other = v_me then
    perform public.fail('not_found');
  end if;
  insert into public.friendships (user_low, user_high, status, requested_by)
  values (least(v_me, p_other), greatest(v_me, p_other), 'blocked', v_me)
  on conflict (user_low, user_high) do update
    set status = 'blocked', requested_by = v_me
    where public.friendships.status <> 'blocked';
end $$;
grant execute on function public.block_user(uuid) to authenticated;

-- Cliques --------------------------------------------------------------------

create function public.add_clique_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.clique_members (clique_id, user_id, role, status, joined_at)
  values (new.id, new.owner_id, 'owner', 'active', now());
  return new;
end $$;

create trigger add_clique_owner
  after insert on public.cliques
  for each row execute function public.add_clique_owner();

create function public.active_member_count(p_clique_id uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.clique_members where clique_id = p_clique_id and status = 'active'
$$;

create function public.is_active_member(p_clique_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clique_members where clique_id = p_clique_id and user_id = p_user_id and status = 'active'
  )
$$;

create function public.is_clique_owner(p_clique_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cliques where id = p_clique_id and owner_id = auth.uid())
$$;

-- Adds or reactivates a member. Shared by accepting an invite and redeeming an invite code.
create function public.activate_member(p_clique_id uuid, p_user_id uuid, p_invited_by uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_active_member(p_clique_id, p_user_id) then
    return;
  end if;
  if public.active_member_count(p_clique_id) >= public.clique_capacity() then
    perform public.fail('clique_full');
  end if;
  insert into public.clique_members (clique_id, user_id, status, invited_by, joined_at)
  values (p_clique_id, p_user_id, 'active', p_invited_by, now())
  on conflict (clique_id, user_id) do update set status = 'active', role = 'member', joined_at = now();
end $$;

create function public.invite_to_clique(p_clique_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
begin
  if not public.is_active_member(p_clique_id, v_me) then
    perform public.fail('not_found');
  end if;
  if not public.are_friends(v_me, p_user_id) then
    perform public.fail('not_friends');
  end if;
  if public.is_active_member(p_clique_id, p_user_id) then
    return;
  end if;
  if public.active_member_count(p_clique_id) >= public.clique_capacity() then
    perform public.fail('clique_full');
  end if;
  insert into public.clique_members (clique_id, user_id, status, invited_by)
  values (p_clique_id, p_user_id, 'invited', v_me)
  on conflict (clique_id, user_id) do update set status = 'invited', invited_by = v_me, role = 'member';
end $$;
grant execute on function public.invite_to_clique(uuid, uuid) to authenticated;

create function public.respond_clique_invite(p_clique_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_invited_by uuid;
begin
  select invited_by into v_invited_by from public.clique_members
  where clique_id = p_clique_id and user_id = v_me and status = 'invited';
  if not found then
    perform public.fail('not_found');
  end if;
  if p_accept then
    perform public.activate_member(p_clique_id, v_me, v_invited_by);
  else
    delete from public.clique_members where clique_id = p_clique_id and user_id = v_me;
  end if;
end $$;
grant execute on function public.respond_clique_invite(uuid, boolean) to authenticated;

-- When the owner goes, the longest-standing member takes over. An empty clique is deleted.
create function public.hand_over_or_delete_clique(p_clique_id uuid, p_leaving uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_next uuid;
begin
  select user_id into v_next from public.clique_members
  where clique_id = p_clique_id and status = 'active' and user_id <> p_leaving
  order by joined_at
  limit 1;
  if v_next is null then
    delete from public.cliques where id = p_clique_id;
    return;
  end if;
  update public.cliques set owner_id = v_next where id = p_clique_id;
  update public.clique_members set role = 'owner' where clique_id = p_clique_id and user_id = v_next;
end $$;

-- Someone who leaves drops off the current boards; past awards stay.
create function public.leave_clique(p_clique_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
begin
  if not public.is_active_member(p_clique_id, v_me) then
    perform public.fail('not_found');
  end if;
  if public.is_clique_owner(p_clique_id) then
    perform public.hand_over_or_delete_clique(p_clique_id, v_me);
  end if;
  update public.clique_members set status = 'left', role = 'member'
  where clique_id = p_clique_id and user_id = v_me;
end $$;
grant execute on function public.leave_clique(uuid) to authenticated;

create function public.remove_clique_member(p_clique_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_clique_owner(p_clique_id) or p_user_id = public.require_user() then
    perform public.fail('not_allowed');
  end if;
  update public.clique_members set status = 'left'
  where clique_id = p_clique_id and user_id = p_user_id and status in ('active', 'invited');
end $$;
grant execute on function public.remove_clique_member(uuid, uuid) to authenticated;

create function public.transfer_clique_ownership(p_clique_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
begin
  if not public.is_clique_owner(p_clique_id) or not public.is_active_member(p_clique_id, p_user_id) then
    perform public.fail('not_allowed');
  end if;
  update public.cliques set owner_id = p_user_id where id = p_clique_id;
  update public.clique_members set role = 'member' where clique_id = p_clique_id and user_id = v_me;
  update public.clique_members set role = 'owner' where clique_id = p_clique_id and user_id = p_user_id;
end $$;
grant execute on function public.transfer_clique_ownership(uuid, uuid) to authenticated;

-- Invites --------------------------------------------------------------------

-- Six characters without look-alikes (no 0/O, 1/I), drawn from random bytes.
create function public.new_invite_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', get_byte(bytes, i) % 32 + 1, 1), '' order by i
  )
  from (select uuid_send(gen_random_uuid()) as bytes) as random_source, generate_series(0, 5) as i
$$;

create function public.create_invite(p_clique_id uuid default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_code text;
begin
  if not public.is_joined() then
    perform public.fail('not_joined');
  end if;
  if p_clique_id is not null and not public.is_active_member(p_clique_id, v_me) then
    perform public.fail('not_found');
  end if;
  loop
    v_code := public.new_invite_code();
    exit when not exists (select 1 from public.invites where code = v_code);
  end loop;
  insert into public.invites (code, inviter_id, clique_id) values (v_code, v_me, p_clique_id);
  return v_code;
end $$;
grant execute on function public.create_invite(uuid) to authenticated;

-- Joining with a code makes the inviter a friend straight away (both sides already chose each other)
-- and adds the clique, so nobody starts with an empty Today screen.
create function public.redeem_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_invite public.invites;
begin
  select * into v_invite from public.invites where code = upper(btrim(p_code)) for update;
  if found and v_invite.used_by = v_me then
    return v_invite.clique_id;
  end if;
  if not found or v_invite.used_by is not null or v_invite.expires_at < now() or v_invite.inviter_id = v_me then
    perform public.fail('invalid_invite');
  end if;

  update public.invites set used_by = v_me, used_at = now() where code = v_invite.code;
  update public.profiles set joined_at = coalesce(joined_at, now()) where id = v_me;
  insert into public.friendships (user_low, user_high, status, requested_by)
  values (least(v_me, v_invite.inviter_id), greatest(v_me, v_invite.inviter_id), 'accepted', v_invite.inviter_id)
  on conflict (user_low, user_high) do update set status = 'accepted'
    where public.friendships.status = 'pending';
  if v_invite.clique_id is not null then
    perform public.activate_member(v_invite.clique_id, v_me, v_invite.inviter_id);
  end if;
  return v_invite.clique_id;
end $$;
grant execute on function public.redeem_invite(text) to authenticated;

-- Push subscriptions ---------------------------------------------------------

-- One row per device. A device that changes account moves to the new account.
create function public.save_push_subscription(p_subscription jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_endpoint text := p_subscription ->> 'endpoint';
begin
  if v_endpoint is null or v_endpoint !~ '^https://' then
    perform public.fail('invalid_subscription');
  end if;
  insert into public.push_subscriptions (user_id, endpoint, subscription)
  values (v_me, v_endpoint, p_subscription)
  on conflict (endpoint) do update set user_id = v_me, subscription = p_subscription, updated_at = now();
end $$;
grant execute on function public.save_push_subscription(jsonb) to authenticated;

-- Account --------------------------------------------------------------------

-- Deletes the account and all its data. Cheers already sent stay, shown as from a former member.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_clique_id uuid;
begin
  for v_clique_id in select id from public.cliques where owner_id = v_me loop
    perform public.hand_over_or_delete_clique(v_clique_id, v_me);
  end loop;
  delete from auth.users where id = v_me;
end $$;
grant execute on function public.delete_my_account() to authenticated;

grant execute on function public.is_joined() to authenticated;
