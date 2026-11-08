-- Workout routines: what someone trains, how many times a week, and optionally on which days.
-- A routine is a personal plan of intent. Each chosen day can carry a name ("Leg day").

create type public.weekday as enum ('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA');

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id),
  times_per_week integer not null check (times_per_week between 1 and 7),
  created_at timestamptz not null default now()
);
create index routines_user_idx on public.routines (user_id);

create table public.routine_days (
  routine_id uuid not null references public.routines (id) on delete cascade,
  weekday public.weekday not null,
  name text check (char_length(btrim(name)) between 1 and 40),
  primary key (routine_id, weekday)
);

-- Saving replaces the routine and its days in one step, so the days never outnumber the
-- sessions, even halfway through an edit. p_days is [{"weekday": "MO", "name": "Leg day"}, ...];
-- a blank name means the day has none. A null p_routine_id creates a new routine.
create function public.save_routine(
  p_routine_id uuid,
  p_activity_id uuid,
  p_times_per_week integer,
  p_days jsonb default '[]'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_routine_id uuid := p_routine_id;
begin
  perform public.assert_activity_usable(p_activity_id);
  if jsonb_array_length(p_days) > p_times_per_week then
    perform public.fail('routine_days_exceed_times');
  end if;

  if v_routine_id is null then
    insert into public.routines (user_id, activity_id, times_per_week)
    values (v_me, p_activity_id, p_times_per_week)
    returning id into v_routine_id;
  else
    update public.routines set activity_id = p_activity_id, times_per_week = p_times_per_week
    where id = v_routine_id and user_id = v_me;
    if not found then
      perform public.fail('not_found');
    end if;
    delete from public.routine_days where routine_id = v_routine_id;
  end if;

  insert into public.routine_days (routine_id, weekday, name)
  select v_routine_id, (day ->> 'weekday')::public.weekday, nullif(btrim(day ->> 'name'), '')
  from jsonb_array_elements(p_days) as day;

  return v_routine_id;
end $$;
grant execute on function public.save_routine(uuid, uuid, integer, jsonb) to authenticated;

-- Owner only, like the plan. Every write except removal goes through save_routine().
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;

grant select, delete on public.routines to authenticated;
create policy routines_owner on public.routines for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.routine_days to authenticated;
create policy routine_days_owner on public.routine_days for select to authenticated using (
  exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid()))
);
