-- Sign-in and sign-up both use a 6-digit email code, as in the battalion logistics app.
-- Anyone who signs up is in: invite codes and the "joined" gate go away.

drop function public.redeem_invite(text);
drop function public.create_invite(uuid);
drop function public.new_invite_code();
drop table public.invites;

drop policy cliques_insert on public.cliques;
create policy cliques_insert on public.cliques for insert to authenticated
  with check (owner_id = (select auth.uid()));

create or replace function public.search_profiles(p_query text)
returns table (id uuid, full_name text, avatar_url text, friendship text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.avatar_url, public.friendship_status_with(p.id)
  from public.profiles p
  where p.id <> auth.uid()
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
  if p_other = v_me or not exists (select 1 from public.profiles where id = p_other) then
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

create or replace function public.enqueue_plan_reminders() returns integer
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
    where (p.paused_until is null or p.paused_until < t.today)
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

create or replace function public.enqueue_missed_plan_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select p.id as user_id, t.today
    from public.profiles p
    cross join lateral (select public.local_day(p.id) as today, (now() at time zone p.time_zone)::time as now_local) t
    where (p.paused_until is null or p.paused_until < t.today)
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

drop function public.is_joined();
alter table public.profiles drop column joined_at;
