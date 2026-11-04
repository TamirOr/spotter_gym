-- Read models for the screens. Leaderboards and goal progress start as plain SQL over check-ins:
-- five users do not need precomputed tables.

-- Today: the friend lines -------------------------------------------------------

-- One line per other active member: who is training, who is done, who has a plan, and what I may send.
-- Friends see today's planned time only, never a missed plan.
create function public.clique_today(p_clique_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  status text,
  activity_id uuid,
  planned_time time,
  checkin_id uuid,
  cheered boolean,
  nudged boolean,
  can_nudge boolean
)
language sql stable security definer set search_path = '' as $$
  with members as (
    select p.id, p.full_name, p.avatar_url, public.local_day(p.id) as today
    from public.clique_members m
    join public.profiles p on p.id = m.user_id
    where m.clique_id = p_clique_id and m.status = 'active' and m.user_id <> auth.uid()
      and public.is_active_member(p_clique_id, auth.uid())
  ),
  lines as (
    select
      m.*,
      going.id as going_id, going.activity_id as going_activity_id,
      done.id as done_id, done.activity_id as done_activity_id,
      planned.activity_id as planned_activity_id, planned.time as planned_time
    from members m
    left join lateral (
      select c.id, c.activity_id from public.checkins c
      where c.user_id = m.id and c.state = 'going' and public.going_is_active(c.started_at)
    ) going on true
    left join lateral (
      select c.id, c.activity_id from public.checkins c
      where c.user_id = m.id and c.state = 'done' and c.local_day = m.today
      order by c.ended_at desc limit 1
    ) done on true
    left join lateral (
      select o.activity_id, o.time from public.plan_occurrences(m.id, m.today, m.today) o
      where o.occurs_on = m.today and not o.skipped
      order by o.time nulls last limit 1
    ) planned on true
  )
  select
    l.id,
    l.full_name,
    l.avatar_url,
    case
      when l.going_id is not null then 'training'
      when l.done_id is not null then 'done'
      when l.planned_activity_id is not null then 'planned'
      else 'none'
    end,
    coalesce(l.going_activity_id, l.done_activity_id, l.planned_activity_id),
    case when l.going_id is null and l.done_id is null then l.planned_time end,
    coalesce(l.going_id, l.done_id),
    exists (
      select 1 from public.reactions r
      where r.checkin_id = coalesce(l.going_id, l.done_id) and r.sender_id = auth.uid() and r.type <> 'note'
    ),
    exists (
      select 1 from public.nudges n where n.sender_id = auth.uid() and n.recipient_id = l.id and n.day = l.today
    ),
    public.can_nudge(l.id)
  from lines l
  order by
    case when l.going_id is not null then 0 when l.done_id is not null then 1 when l.planned_activity_id is not null then 2 else 3 end,
    l.planned_time nulls last,
    l.full_name
$$;
grant execute on function public.clique_today(uuid) to authenticated;

-- Today: my own bar -------------------------------------------------------------

-- Everything the Today bar needs. The app picks the bar state from these facts.
create function public.my_today()
returns table (
  today date,
  planned_plan_item_id uuid,
  planned_activity_id uuid,
  planned_time time,
  going_checkin_id uuid,
  going_activity_id uuid,
  going_started_at timestamptz,
  going_expired boolean,
  done_checkin_id uuid,
  done_activity_id uuid,
  cheer_count integer,
  friends_training integer
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id, public.local_day(auth.uid()) as today),
  planned as (
    select o.plan_item_id, o.activity_id, o.time
    from me, public.plan_occurrences(me.id, me.today, me.today) o
    where o.occurs_on = me.today and not o.skipped
      and not exists (
        select 1 from public.checkins c
        where c.plan_item_id = o.plan_item_id and c.local_day = me.today and c.state = 'done'
      )
    order by o.time nulls last
    limit 1
  ),
  going as (
    select c.id, c.activity_id, c.started_at from me, public.checkins c where c.user_id = me.id and c.state = 'going'
  ),
  done as (
    select c.id, c.activity_id from me, public.checkins c
    where c.user_id = me.id and c.state = 'done' and c.local_day = me.today
    order by c.ended_at desc limit 1
  )
  select
    me.today,
    planned.plan_item_id, planned.activity_id, planned.time,
    going.id, going.activity_id, going.started_at, not public.going_is_active(going.started_at),
    done.id, done.activity_id,
    (
      select count(*)::integer from public.reactions r
      join public.checkins c on c.id = r.checkin_id
      where c.user_id = me.id and c.local_day = me.today and c.state = 'done'
    ),
    (
      select count(distinct c.user_id)::integer from public.checkins c
      where c.state = 'going' and public.going_is_active(c.started_at)
        and c.user_id in (
          select other.user_id from public.clique_members other
          where other.status = 'active' and other.user_id <> me.id
            and other.clique_id in (select public.my_clique_ids())
        )
    )
  from me
  left join planned on true
  left join going on true
  left join done on true
$$;
grant execute on function public.my_today() to authenticated;

-- Leaderboard -------------------------------------------------------------------

create function public.period_range(p_period text, p_today date, p_periods_ago integer)
returns table (first_day date, last_day date)
language sql immutable set search_path = '' as $$
  select
    case p_period
      when 'week' then public.week_start(p_today) - 7 * p_periods_ago
      else (date_trunc('month', p_today) - make_interval(months => p_periods_ago))::date
    end,
    case p_period
      when 'week' then public.week_start(p_today) - 7 * p_periods_ago + 6
      else (date_trunc('month', p_today) - make_interval(months => p_periods_ago - 1) - interval '1 day')::date
    end
$$;

-- The consistency board: % of each member's own locked plan completed. Ties share a rank.
-- Members who are paused, or planned fewer than 2 workouts, are listed but unranked.
create function public.clique_leaderboard(p_clique_id uuid, p_period text default 'week', p_periods_ago integer default 0)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  planned integer,
  completed integer,
  score numeric,
  rank integer
)
language sql stable security definer set search_path = '' as $$
  with clique as (
    select c.id, (now() at time zone c.time_zone)::date as today
    from public.cliques c
    where c.id = p_clique_id
      and public.is_active_member(c.id, auth.uid())
      and p_period in ('week', 'month')
      and p_periods_ago >= 0
  ),
  range as (
    select r.first_day, r.last_day from clique, public.period_range(p_period, clique.today, p_periods_ago) r
  ),
  scores as (
    select
      p.id, p.full_name, p.avatar_url, s.planned, s.completed,
      case when s.planned > 0 then round(s.completed::numeric / s.planned, 4) else 0 end as score,
      s.planned >= 2 and not coalesce(p.paused_until >= range.first_day, false) as ranked
    from clique
    cross join range
    join public.clique_members m on m.clique_id = clique.id and m.status = 'active'
    join public.profiles p on p.id = m.user_id
    cross join lateral public.consistency(p.id, range.first_day, range.last_day) s
  )
  select
    s.id, s.full_name, s.avatar_url, s.planned, s.completed, s.score,
    case when s.ranked then (rank() over (partition by s.ranked order by s.score desc))::integer end
  from scores s
  order by s.ranked desc, s.score desc, s.full_name
$$;
grant execute on function public.clique_leaderboard(uuid, text, integer) to authenticated;

-- Me: the week grid -------------------------------------------------------------

-- My week, day by day: planned workouts with their outcome, plus unplanned workouts I logged.
create function public.my_week(p_week_start date)
returns table (
  day date,
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
  )
  select
    o.occurs_on, o.activity_id, o.time, o.plan_item_id, o.checkin_id,
    case
      when o.checkin_id is not null then 'done'
      when o.skipped then 'skipped'
      when o.occurs_on < me.today then 'missed'
      else 'planned'
    end
  from occurrences o, me
  union all
  select c.local_day, c.activity_id, null, null, c.id, 'done'
  from me
  join public.checkins c on c.user_id = me.id
  where c.state = 'done' and c.plan_item_id is null
    and c.local_day between public.week_start(p_week_start) and public.week_start(p_week_start) + 6
  order by 1, 3 nulls last
$$;
grant execute on function public.my_week(date) to authenticated;

-- Goals -------------------------------------------------------------------------

create function public.goal_progress_value(p_goal public.goals, p_first_day date, p_last_day date) returns numeric
language sql stable security definer set search_path = '' as $$
  select case p_goal.metric
    when 'sessions' then (
      select count(*) from public.checkins c
      where c.user_id = p_goal.user_id and c.activity_id = p_goal.activity_id and c.state = 'done'
        and c.local_day between p_first_day and p_last_day
    )
    -- Health totals and logged distances describe the same walks, so take the larger, not the sum.
    when 'distance_km' then greatest(
      (select coalesce(sum(c.distance_km), 0) from public.checkins c
        where c.user_id = p_goal.user_id and c.activity_id = p_goal.activity_id and c.state = 'done'
          and c.local_day between p_first_day and p_last_day),
      (select coalesce(sum(d.distance_km), 0) from public.daily_metrics d
        where d.user_id = p_goal.user_id and d.day between p_first_day and p_last_day)
    )
    when 'steps' then (
      select coalesce(sum(d.steps), 0) from public.daily_metrics d
      where d.user_id = p_goal.user_id and d.day between p_first_day and p_last_day
    )
  end
$$;

-- Current goals with progress in their current period.
-- Without a clique: all my goals. With a clique: the shared goals of its active members.
create function public.goal_progress(p_clique_id uuid default null)
returns table (
  goal_id uuid,
  user_id uuid,
  activity_id uuid,
  metric public.goal_metric,
  target numeric,
  period public.goal_period,
  visibility public.goal_visibility,
  progress numeric
)
language sql stable security definer set search_path = '' as $$
  with owners as (
    select auth.uid() as id where p_clique_id is null
    union
    select m.user_id from public.clique_members m
    where p_clique_id is not null and m.clique_id = p_clique_id and m.status = 'active'
      and public.is_active_member(p_clique_id, auth.uid())
  ),
  current_goals as (
    select g, r.first_day, r.last_day
    from owners o
    join public.goals g on g.user_id = o.id
    cross join lateral (select public.local_day(g.user_id) as today) t
    cross join lateral public.period_range(
      case g.period when 'month' then 'month' else 'week' end, t.today, 0
    ) r
    where g.starts_on <= t.today and (g.ends_on is null or g.ends_on >= t.today)
      and (p_clique_id is null or g.visibility = 'shared')
  )
  select
    (cg.g).id, (cg.g).user_id, (cg.g).activity_id, (cg.g).metric, (cg.g).target, (cg.g).period, (cg.g).visibility,
    public.goal_progress_value(
      cg.g,
      case (cg.g).period when 'day' then public.local_day((cg.g).user_id) else cg.first_day end,
      case (cg.g).period when 'day' then public.local_day((cg.g).user_id) else cg.last_day end
    )
  from current_goals cg
  order by (cg.g).user_id, (cg.g).created_at
$$;
grant execute on function public.goal_progress(uuid) to authenticated;
