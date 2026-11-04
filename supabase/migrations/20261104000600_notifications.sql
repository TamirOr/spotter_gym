-- Notifications: triggers write to the outbox; the push-dispatch Edge Function drains it every minute.
-- Rows carry ids and names only. The dispatcher writes the text in the recipient's language.

-- Quiet hours (default 22:00-07:00) hold non-urgent pushes until they end. Going gets through by default,
-- so an early gym trip still reaches friends; each person can turn that off.
create function public.notification_send_time(p_recipient_id uuid, p_kind public.notification_kind)
returns timestamptz
language sql stable security definer set search_path = '' as $$
  with settings as (
    select
      p.time_zone,
      p.quiet_hours_start as quiet_start,
      p.quiet_hours_end as quiet_end,
      (now() at time zone p.time_zone) as local_now,
      p_kind = 'going' and p.going_ignores_quiet_hours as urgent
    from public.profiles p
    where p.id = p_recipient_id
  ),
  state as (
    select
      s.*,
      case
        when s.quiet_start > s.quiet_end then s.local_now::time >= s.quiet_start or s.local_now::time < s.quiet_end
        else s.local_now::time >= s.quiet_start and s.local_now::time < s.quiet_end
      end as in_quiet_hours
    from settings s
  )
  select case
    when not in_quiet_hours or urgent then now()
    -- Before midnight on an overnight window, quiet hours end tomorrow.
    when quiet_start > quiet_end and local_now::time >= quiet_start
      then ((local_now::date + 1) + quiet_end) at time zone time_zone
    else (local_now::date + quiet_end) at time zone time_zone
  end
  from state
$$;

create function public.enqueue_notification(
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
  where p.id = p_recipient_id and not (p_kind = any (p.muted_notification_kinds))
  on conflict (recipient_id, kind, dedupe_key) do nothing
$$;

create function public.display_name(p_user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select full_name from public.profiles where id = p_user_id
$$;

-- Who hears about my workouts: everyone sharing an active clique with me that they have not muted.
-- A user in two shared cliques is listed once, so they get one notification for the same Going.
create function public.workout_audience(p_actor_id uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct theirs.user_id
  from public.clique_members mine
  join public.clique_members theirs on theirs.clique_id = mine.clique_id
  where mine.user_id = p_actor_id and mine.status = 'active'
    and theirs.status = 'active' and theirs.user_id <> p_actor_id and not theirs.muted
$$;

-- Going and Done go to the clique. Several friends training at once become one grouped push.
create function public.notify_workout() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.notification_kind;
  v_recipient uuid;
begin
  if new.state = 'going' and tg_op = 'INSERT' then
    v_kind := 'going';
  elsif new.state = 'done' and (tg_op = 'INSERT' or old.state is distinct from 'done') then
    v_kind := 'done';
  else
    return new;
  end if;

  for v_recipient in select public.workout_audience(new.user_id) loop
    perform public.enqueue_notification(
      v_recipient,
      v_kind,
      jsonb_build_object(
        'actor_id', new.user_id, 'actor_name', public.display_name(new.user_id),
        'checkin_id', new.id, 'activity_id', new.activity_id
      ),
      v_kind::text,
      new.id::text
    );
  end loop;
  return new;
end $$;

create trigger notify_workout
  after insert or update of state on public.checkins
  for each row execute function public.notify_workout();

-- Cheers reach the athlete grouped per check-in.
create function public.notify_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_athlete uuid;
begin
  select user_id into v_athlete from public.checkins where id = new.checkin_id;
  perform public.enqueue_notification(
    v_athlete,
    'cheer',
    jsonb_build_object(
      'checkin_id', new.checkin_id, 'sender_name', public.display_name(new.sender_id),
      'type', new.type, 'body', new.body
    ),
    'cheer:' || new.checkin_id
  );
  return new;
end $$;

create trigger notify_reaction
  after insert on public.reactions
  for each row execute function public.notify_reaction();

create function public.notify_nudge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.enqueue_notification(
    new.recipient_id,
    'nudge',
    jsonb_build_object('sender_id', new.sender_id, 'sender_name', public.display_name(new.sender_id), 'body', new.body),
    'nudge:' || new.sender_id
  );
  return new;
end $$;

create trigger notify_nudge
  after insert on public.nudges
  for each row execute function public.notify_nudge();

create function public.notify_friend_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recipient uuid := case when new.requested_by = new.user_low then new.user_high else new.user_low end;
begin
  if new.status = 'pending' then
    perform public.enqueue_notification(
      v_recipient,
      'friend_invite',
      jsonb_build_object('sender_id', new.requested_by, 'sender_name', public.display_name(new.requested_by)),
      'friend_invite'
    );
  end if;
  return new;
end $$;

create trigger notify_friend_request
  after insert on public.friendships
  for each row execute function public.notify_friend_request();

create function public.notify_clique_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'invited' and (tg_op = 'INSERT' or old.status <> 'invited') then
    perform public.enqueue_notification(
      new.user_id,
      'clique_invite',
      jsonb_build_object(
        'clique_id', new.clique_id,
        'clique_name', (select name from public.cliques where id = new.clique_id),
        'sender_name', public.display_name(new.invited_by)
      ),
      'clique_invite:' || new.clique_id
    );
  end if;
  return new;
end $$;

create trigger notify_clique_invite
  after insert or update of status on public.clique_members
  for each row execute function public.notify_clique_invite();

-- Scheduled reminders ----------------------------------------------------------

-- Run every few minutes: a reminder at each user's chosen lead time before a planned workout.
create function public.enqueue_plan_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select p.id as user_id, o.plan_item_id, o.activity_id, o.time, t.today
    from public.profiles p
    cross join lateral (select public.local_day(p.id) as today, (now() at time zone p.time_zone)::time as now_local) t
    cross join lateral public.plan_occurrences(p.id, t.today, t.today) o
    join public.plan_items item on item.id = o.plan_item_id
    where p.joined_at is not null
      and (p.paused_until is null or p.paused_until < t.today)
      and o.occurs_on = t.today and not o.skipped and o.time is not null
      and item.reminder_lead_min is not null
      and t.now_local between o.time - make_interval(mins => item.reminder_lead_min) and o.time
  loop
    perform public.enqueue_notification(
      v_row.user_id,
      'plan_reminder',
      jsonb_build_object('activity_id', v_row.activity_id, 'time', v_row.time),
      'plan_reminder',
      v_row.plan_item_id || ':' || v_row.today
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Run every few minutes: at 21:00 local, a gentle reminder for a planned workout not yet logged.
-- This also covers any automation that failed to run.
create function public.enqueue_missed_plan_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select p.id as user_id, t.today
    from public.profiles p
    cross join lateral (select public.local_day(p.id) as today, (now() at time zone p.time_zone)::time as now_local) t
    where p.joined_at is not null
      and (p.paused_until is null or p.paused_until < t.today)
      and extract(hour from t.now_local) = 21
      and exists (
        select 1 from public.plan_occurrences(p.id, t.today, t.today) o
        where o.occurs_on = t.today and not o.skipped
          and not exists (
            select 1 from public.checkins c
            where c.plan_item_id = o.plan_item_id and c.local_day = t.today and c.state = 'done'
          )
      )
  loop
    perform public.enqueue_notification(v_row.user_id, 'plan_missed', '{}', 'plan_missed', v_row.today::text);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Dispatcher ------------------------------------------------------------------

-- Claims every due row for one dispatch run. Rows are marked sent before delivery, so a crashed run
-- drops a push rather than sending it twice: a missed push is cheaper than a duplicate.
create function public.claim_due_notifications(p_limit integer default 500)
returns table (
  id bigint,
  recipient_id uuid,
  language public.app_language,
  kind public.notification_kind,
  payload jsonb,
  group_key text
)
language sql security definer set search_path = '' as $$
  with due as (
    select n.id from public.notifications n
    where n.sent_at is null and n.send_after <= now()
    order by n.id
    limit p_limit
    for update skip locked
  ),
  claimed as (
    update public.notifications n set sent_at = now()
    from due where n.id = due.id
    returning n.id, n.recipient_id, n.kind, n.payload, n.group_key
  )
  select c.id, c.recipient_id, p.language, c.kind, c.payload, c.group_key
  from claimed c join public.profiles p on p.id = c.recipient_id
  order by c.id
$$;

-- Keeps the outbox small: sent rows are only needed briefly for debugging.
create function public.prune_notifications() returns void
language sql security definer set search_path = '' as $$
  delete from public.notifications where sent_at < now() - interval '7 days'
$$;

grant execute on function
  public.claim_due_notifications(integer),
  public.enqueue_plan_reminders(),
  public.enqueue_missed_plan_reminders(),
  public.prune_notifications()
to service_role;
