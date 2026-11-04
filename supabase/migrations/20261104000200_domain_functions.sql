-- Pure domain helpers shared by RLS, triggers and RPCs. None of them is callable by the app directly.

-- Names are trimmed, lower-cased and space-collapsed. Hebrew vowel marks are dropped and final letters
-- treated like regular ones, so "gym", " GYM " and "חדר  כושר" each have one canonical form.
-- The maqaf (U+05BE) is punctuation, not a vowel mark, so it is kept.
create function public.normalize_name(p_name text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select translate(
    regexp_replace(
      regexp_replace(lower(btrim(p_name)), '[֑-ׇֽֿׁׂׅׄ]', '', 'g'),
      '\s+', ' ', 'g'
    ),
    'ךםןףץ', 'כמנפצ'
  )
$$;

-- The week starts on Sunday.
create function public.week_start(p_day date)
returns date
language sql immutable parallel safe
set search_path = ''
as $$
  select p_day - extract(dow from p_day)::integer
$$;

create function public.user_time_zone(p_user_id uuid)
returns text
language sql stable
security definer
set search_path = ''
as $$
  select coalesce((select time_zone from public.profiles where id = p_user_id), 'UTC')
$$;

-- A workout counts toward the local day it happened on.
create function public.local_day(p_user_id uuid, p_at timestamptz default now())
returns date
language sql stable
set search_path = ''
as $$
  select (p_at at time zone public.user_time_zone(p_user_id))::date
$$;

-- Supported RRULE subset (enforced by the check on plan_items.rrule):
--   FREQ=WEEKLY[;INTERVAL=n];BYDAY=SU,MO,...   every n weeks on the given weekdays
--   FREQ=MONTHLY;BYMONTHDAY=d                  day d of each month (skipped in shorter months)
--   null                                       a single workout on p_starts_on
create function public.rrule_occurs_on(p_rrule text, p_starts_on date, p_day date)
returns boolean
language sql immutable parallel safe
set search_path = ''
as $$
  select case
    when p_day < p_starts_on then false
    when p_rrule is null then p_day = p_starts_on
    when p_rrule like 'FREQ=WEEKLY%' then
      (array['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'])[extract(dow from p_day)::integer + 1]
        = any (string_to_array(substring(p_rrule from 'BYDAY=([A-Z,]+)'), ','))
      and ((public.week_start(p_day) - public.week_start(p_starts_on)) / 7)
        % coalesce(substring(p_rrule from 'INTERVAL=([0-9])')::integer, 1) = 0
    when p_rrule like 'FREQ=MONTHLY%' then
      extract(day from p_day)::integer = substring(p_rrule from 'BYMONTHDAY=([0-9]+)')::integer
    else false
  end
$$;

-- Every planned occurrence for a user between two dates, after skips and moves.
-- p_locked_at reproduces the plan as it was at that moment, so plans lock when the week starts.
create function public.plan_occurrences(p_user_id uuid, p_from date, p_to date, p_locked_at timestamptz default null)
returns table (
  plan_item_id uuid,
  activity_id uuid,
  planned_on date,
  occurs_on date,
  "time" time,
  skipped boolean
)
language sql stable
security definer
set search_path = ''
as $$
  select
    item.id,
    item.activity_id,
    day::date,
    coalesce(exception.new_date, day::date),
    item.time,
    coalesce(exception.action = 'skip', false)
  from public.plan_items item
  cross join generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as day
  left join public.plan_exceptions exception
    on exception.plan_item_id = item.id and exception.occurs_on = day::date
  where item.user_id = p_user_id
    and public.rrule_occurs_on(item.rrule, item.starts_on, day::date)
    and case
      when p_locked_at is null then item.deleted_at is null
      else item.created_at < p_locked_at and (item.deleted_at is null or item.deleted_at >= p_locked_at)
    end
$$;

-- Consistency score inputs for one user over a date range, computed week by week.
-- Each Done in a week fills one planned slot of that week, whether it was planned or not, so a moved
-- workout counts as completed, a skipped one as missed, and an unplanned one fills a missed slot.
-- Capping per week stops a big week from covering for a missed one.
create function public.consistency(p_user_id uuid, p_from date, p_to date)
returns table (planned integer, completed integer)
language sql stable
security definer
set search_path = ''
as $$
  with weeks as (
    select
      greatest(week::date, p_from) as first_day,
      least(week::date + 6, p_to) as last_day,
      (week::timestamp at time zone public.user_time_zone(p_user_id)) as locked_at
    from generate_series(public.week_start(p_from)::timestamp, p_to::timestamp, interval '7 days') as week
  ),
  per_week as (
    select
      (select count(*) from public.plan_occurrences(p_user_id, w.first_day, w.last_day, w.locked_at))::integer
        as planned,
      (select count(*) from public.checkins c
        where c.user_id = p_user_id and c.state = 'done' and c.local_day between w.first_day and w.last_day)::integer
        as done
    from weeks w
  )
  select coalesce(sum(planned), 0)::integer, coalesce(sum(least(planned, done)), 0)::integer
  from per_week
$$;

-- Visibility helpers used by RLS. They are security definer so policies do not recurse into each other.

create function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where user_low = least(p_a, p_b) and user_high = greatest(p_a, p_b) and status = 'accepted'
  )
$$;

create function public.my_clique_ids()
returns setof uuid
language sql stable
security definer
set search_path = ''
as $$
  select clique_id from public.clique_members where user_id = auth.uid() and status = 'active'
$$;

create function public.shares_clique(p_other uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clique_members
    where user_id = p_other and status = 'active' and clique_id in (select public.my_clique_ids())
  )
$$;

-- A client can read another user's rows only through friendship or a shared clique.
create function public.can_see(p_other uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select p_other = auth.uid() or public.are_friends(auth.uid(), p_other) or public.shares_clique(p_other)
$$;

-- Functions are executable by nobody unless granted. PUBLIC's default can only be revoked globally;
-- Supabase's own default grant to anon and authenticated is per schema.
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- RLS policies run these as the querying user. Each only answers questions about the caller's own relations.
grant execute on function public.can_see(uuid), public.shares_clique(uuid), public.my_clique_ids() to authenticated;
