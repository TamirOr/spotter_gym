-- Routines are shared with the clique. Everyone who shares an active clique with the owner sees their
-- routines. Joining a clique, by creating it, accepting an invite or being added, makes them visible
-- right away: visibility is worked out from membership on every read, so nothing is copied on join or leave.

-- The owner sees and removes their routines; clique mates see them. Writes stay in save_routine().
drop policy routines_owner on public.routines;
create policy routines_select on public.routines for select to authenticated using (
  user_id = (select auth.uid()) or public.shares_clique(user_id)
);
create policy routines_delete on public.routines for delete to authenticated using (user_id = (select auth.uid()));

-- A day is visible exactly when its routine is: the subquery runs under the routines policy above.
drop policy routine_days_owner on public.routine_days;
create policy routine_days_select on public.routine_days for select to authenticated using (
  exists (select 1 from public.routines r where r.id = routine_id)
);

-- The routines of a clique's active members, for the clique screen. Only members can read it.
-- days is [{"weekday": "MO", "name": "Leg day"}, ...] in week order.
create function public.clique_routines(p_clique_id uuid)
returns table (
  routine_id uuid,
  user_id uuid,
  activity_id uuid,
  times_per_week integer,
  days jsonb
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.user_id, r.activity_id, r.times_per_week,
    coalesce(
      (select jsonb_agg(jsonb_build_object('weekday', d.weekday, 'name', d.name) order by d.weekday)
       from public.routine_days d where d.routine_id = r.id),
      '[]'::jsonb
    )
  from public.clique_members m
  join public.routines r on r.user_id = m.user_id
  where m.clique_id = p_clique_id and m.status = 'active'
    and public.is_active_member(p_clique_id, auth.uid())
  order by r.user_id, r.created_at
$$;
grant execute on function public.clique_routines(uuid) to authenticated;
