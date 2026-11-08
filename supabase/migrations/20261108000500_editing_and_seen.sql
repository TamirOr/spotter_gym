-- The rest of Phase 1: editing goals and plan items, the week grid as the place to fix a log, and
-- "seen" receipts, so the athlete sees who has seen a check-in and a quiet moment does not feel like
-- being ignored.

-- Goals ----------------------------------------------------------------------

-- A change to target or period starts next period as a new version that points back to the one it
-- replaces. Deleting a goal also deletes the versions that follow it.
alter table public.goals add column previous_id uuid references public.goals (id) on delete cascade;
create index goals_previous_idx on public.goals (previous_id) where previous_id is not null;

-- update_goal() replaces revise_goal(): one edit covers target, period, visibility and end date.
drop function public.revise_goal(uuid, numeric, public.goal_period);

-- Visibility and the end date apply at once. Target and period apply from the next period, so past
-- results do not change. Editing again replaces a pending next version instead of adding another.
-- Returns the id of the version that holds the new target.
create function public.update_goal(
  p_goal_id uuid,
  p_target numeric,
  p_period public.goal_period,
  p_visibility public.goal_visibility,
  p_ends_on date default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_goal public.goals;
  v_today date;
  v_starts date;
  v_id uuid;
begin
  select * into v_goal from public.goals where id = p_goal_id and user_id = public.require_user() for update;
  if not found then
    perform public.fail('not_found');
  end if;
  v_today := public.local_day(v_goal.user_id);
  if p_ends_on is not null and p_ends_on < greatest(v_today, v_goal.starts_on) then
    perform public.fail('invalid_end_date');
  end if;

  -- A pending next version gives way to this edit; every branch below sets this version's end date.
  delete from public.goals where previous_id = v_goal.id and starts_on > v_today;

  update public.goals set visibility = p_visibility where id = v_goal.id;

  v_starts := public.next_period_start(p_period, v_today);
  if (p_target = v_goal.target and p_period = v_goal.period)
     -- Ends before the change would start, so the change never applies.
     or (p_ends_on is not null and p_ends_on < v_starts and v_goal.starts_on < v_starts) then
    update public.goals set ends_on = p_ends_on where id = v_goal.id;
    return v_goal.id;
  end if;

  if v_goal.starts_on >= v_starts then
    -- Not in effect yet, so nothing in the past depends on it.
    update public.goals set target = p_target, period = p_period, ends_on = p_ends_on where id = v_goal.id;
    return v_goal.id;
  end if;

  update public.goals set ends_on = v_starts - 1 where id = v_goal.id;
  insert into public.goals (user_id, activity_id, metric, target, period, visibility, starts_on, ends_on, previous_id)
  values (v_goal.user_id, v_goal.activity_id, v_goal.metric, p_target, p_period, p_visibility, v_starts, p_ends_on, v_goal.id)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.update_goal(uuid, numeric, public.goal_period, public.goal_visibility, date)
  to authenticated;

-- Plan -----------------------------------------------------------------------

-- Time and reminder change in place. A new activity, repeat rule or start date replaces the item, so the
-- week already under way keeps counting the old one (plans lock when the week starts).
-- Returns the id of the item that is now in the plan.
create function public.edit_plan_item(
  p_plan_item_id uuid,
  p_activity_id uuid,
  p_time time,
  p_rrule text,
  p_starts_on date,
  p_reminder_lead_min integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.plan_items;
  v_id uuid;
begin
  select * into v_item from public.plan_items
  where id = p_plan_item_id and user_id = public.require_user() and deleted_at is null
  for update;
  if not found then
    perform public.fail('not_found');
  end if;

  if v_item.activity_id = p_activity_id and v_item.rrule is not distinct from p_rrule
     and v_item.starts_on = p_starts_on then
    update public.plan_items set time = p_time, reminder_lead_min = p_reminder_lead_min where id = v_item.id;
    return v_item.id;
  end if;

  update public.plan_items set deleted_at = now() where id = v_item.id;
  insert into public.plan_items (user_id, activity_id, place_id, time, rrule, starts_on, reminder_lead_min)
  values (v_item.user_id, p_activity_id, v_item.place_id, p_time, p_rrule, p_starts_on, p_reminder_lead_min)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.edit_plan_item(uuid, uuid, time, text, date, integer) to authenticated;

-- My week, day by day. Now also returns the day an occurrence was planned on, which is what a skip or a
-- move refers to, and keeps a Done whose plan item was removed or replaced on the grid.
drop function public.my_week(date);
create function public.my_week(p_week_start date)
returns table (
  day date,
  planned_on date,
  activity_id uuid,
  "time" time,
  plan_item_id uuid,
  checkin_id uuid,
  status text
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id, public.local_day(auth.uid()) as today),
  occurrences as (
    select o.*, done.id as checkin_id
    from me
    cross join public.plan_occurrences(me.id, public.week_start(p_week_start), public.week_start(p_week_start) + 6) o
    left join lateral (
      select c.id from public.checkins c
      where c.plan_item_id = o.plan_item_id and c.local_day = o.occurs_on and c.state = 'done'
      limit 1
    ) done on true
  ),
  planned as (
    select
      o.occurs_on as day, o.planned_on, o.activity_id, o.time, o.plan_item_id, o.checkin_id,
      case
        when o.checkin_id is not null then 'done'
        when o.skipped then 'skipped'
        when o.occurs_on < me.today then 'missed'
        else 'planned'
      end as status
    from occurrences o, me
  )
  select * from planned
  union all
  select c.local_day, null, c.activity_id, null, null, c.id, 'done'
  from me
  join public.checkins c on c.user_id = me.id
  where c.state = 'done'
    and c.local_day between public.week_start(p_week_start) and public.week_start(p_week_start) + 6
    and not exists (select 1 from planned p where p.checkin_id = c.id)
  order by 1, 4 nulls last
$$;
grant execute on function public.my_week(date) to authenticated;

-- Seen receipts --------------------------------------------------------------

create table public.checkin_views (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (checkin_id, viewer_id)
);
create index checkin_views_viewer_idx on public.checkin_views (viewer_id);
alter table public.checkin_views enable row level security;

-- The athlete sees who has seen their check-in; a viewer sees their own receipts. Written only below.
grant select on public.checkin_views to authenticated;
create policy checkin_views_select on public.checkin_views for select to authenticated using (
  viewer_id = (select auth.uid())
  or exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = (select auth.uid()))
);

-- The app calls this for the friends' workouts on screen. Only workouts the viewer may see through a
-- shared clique are recorded, and only once each.
create function public.mark_checkins_seen(p_checkin_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
begin
  if coalesce(cardinality(p_checkin_ids), 0) > 50 then
    perform public.fail('too_many');
  end if;
  insert into public.checkin_views (checkin_id, viewer_id)
  select c.id, v_me
  from public.checkins c
  where c.id = any (p_checkin_ids)
    and c.user_id <> v_me
    and c.state in ('going', 'done')
    and public.shares_clique(c.user_id)
  on conflict do nothing;
end $$;
grant execute on function public.mark_checkins_seen(uuid[]) to authenticated;

-- Live: the athlete's "Seen by" updates while they look at it.
do $live$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.checkin_views;
  end if;
end
$live$;
