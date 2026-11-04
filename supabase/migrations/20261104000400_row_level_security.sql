-- Privacy rules. Every table has RLS on; table and column grants decide what each role may touch at all,
-- and policies decide which rows. Writes that span users or need checks against other users' data go
-- through RPCs (see the rules migration) instead of direct grants.

-- Start from nothing: Supabase grants everything to anon and authenticated by default.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.activities enable row level security;
alter table public.goals enable row level security;
alter table public.places enable row level security;
alter table public.place_activities enable row level security;
alter table public.plan_items enable row level security;
alter table public.plan_exceptions enable row level security;
alter table public.checkins enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.cliques enable row level security;
alter table public.clique_members enable row level security;
alter table public.reactions enable row level security;
alter table public.nudges enable row level security;
alter table public.trophy_awards enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.invites enable row level security;
alter table public.notifications enable row level security;

-- profiles: email, settings and tokens are not column-granted; the owner reads them through get_my_profile().
grant select (id, full_name, avatar_url, created_at) on public.profiles to authenticated;
grant update (
  full_name, avatar_url, onboarded_at, language, time_zone, paused_until, nudges_enabled,
  muted_notification_kinds, quiet_hours_start, quiet_hours_end, going_ignores_quiet_hours
) on public.profiles to authenticated;

-- Pending requests and clique invites must show the other person's name, so visibility is wider than can_see.
create policy profiles_select on public.profiles for select to authenticated using (
  public.can_see(id)
  or exists (
    select 1 from public.friendships f
    where f.status = 'pending'
      and (select auth.uid()) in (f.user_low, f.user_high)
      and id in (f.user_low, f.user_high)
  )
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- friendships: written only through RPCs. The blocked person never learns about the block.
grant select on public.friendships to authenticated;
create policy friendships_select on public.friendships for select to authenticated using (
  (select auth.uid()) in (user_low, user_high)
  and (status <> 'blocked' or requested_by = (select auth.uid()))
);

-- activities: presets, my own, and those of people I can see (so their check-ins have names).
grant select on public.activities to authenticated;
grant insert (name, kind) on public.activities to authenticated;
create policy activities_select on public.activities for select to authenticated
  using (owner_id is null or public.can_see(owner_id));
create policy activities_insert on public.activities for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- goals: target and period change only through revise_goal(), so past results do not change.
grant select, delete on public.goals to authenticated;
grant insert (activity_id, metric, target, period, visibility, starts_on, ends_on) on public.goals to authenticated;
grant update (visibility, ends_on) on public.goals to authenticated;
create policy goals_select on public.goals for select to authenticated using (
  user_id = (select auth.uid()) or (visibility = 'shared' and public.can_see(user_id))
);
create policy goals_insert on public.goals for insert to authenticated with check (user_id = (select auth.uid()));
create policy goals_update on public.goals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy goals_delete on public.goals for delete to authenticated using (user_id = (select auth.uid()));

-- plan_items: owner only, so a missed plan is visible only to its owner. Friends see today's plan
-- time through clique_today(). The repeat rule never changes in place; remove and re-add instead.
grant select on public.plan_items to authenticated;
grant insert (activity_id, place_id, time, rrule, starts_on, reminder_lead_min) on public.plan_items to authenticated;
grant update (place_id, time, reminder_lead_min) on public.plan_items to authenticated;
create policy plan_items_owner on public.plan_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.plan_exceptions to authenticated;
create policy plan_exceptions_owner on public.plan_exceptions for all to authenticated using (
  exists (select 1 from public.plan_items p where p.id = plan_item_id and p.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.plan_items p where p.id = plan_item_id and p.user_id = (select auth.uid()))
);

-- places and their activities: owner only, ever.
grant select, delete on public.places to authenticated;
grant insert (name, min_stay_min) on public.places to authenticated;
grant update (name, min_stay_min) on public.places to authenticated;
create policy places_owner on public.places for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, delete on public.place_activities to authenticated;
create policy place_activities_owner on public.place_activities for all to authenticated using (
  exists (select 1 from public.places p where p.id = place_id and p.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.places p where p.id = place_id and p.user_id = (select auth.uid()))
);

-- checkins: created through mark_going() and mark_done(); owners may edit or delete their own logs.
grant select, delete on public.checkins to authenticated;
grant update (activity_id, ended_at, duration_min, distance_km, note) on public.checkins to authenticated;
create policy checkins_select on public.checkins for select to authenticated using (public.can_see(user_id));
create policy checkins_update on public.checkins for update to authenticated
  using (user_id = (select auth.uid()) and state = 'done') with check (user_id = (select auth.uid()));
create policy checkins_delete on public.checkins for delete to authenticated using (user_id = (select auth.uid()));

-- daily_metrics: written by the automation Edge Function. Daily totals only, visible like check-ins.
grant select on public.daily_metrics to authenticated;
create policy daily_metrics_select on public.daily_metrics for select to authenticated using (public.can_see(user_id));

-- cliques: members and invitees see the clique; only the owner edits it.
grant select, delete on public.cliques to authenticated;
grant insert (name, photo_url, time_zone) on public.cliques to authenticated;
grant update (name, photo_url, time_zone) on public.cliques to authenticated;
-- The owner check lets `insert ... returning` see the row before the owner's membership exists.
create policy cliques_select on public.cliques for select to authenticated using (
  owner_id = (select auth.uid())
  or id in (select public.my_clique_ids())
  or exists (
    select 1 from public.clique_members m
    where m.clique_id = id and m.user_id = (select auth.uid()) and m.status = 'invited'
  )
);
create policy cliques_insert on public.cliques for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.is_joined()));
create policy cliques_owner_update on public.cliques for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cliques_owner_delete on public.cliques for delete to authenticated using (owner_id = (select auth.uid()));

-- clique_members: membership changes go through RPCs; a member may only mute or unmute their own row.
grant select on public.clique_members to authenticated;
grant update (muted) on public.clique_members to authenticated;
create policy clique_members_select on public.clique_members for select to authenticated using (
  user_id = (select auth.uid()) or clique_id in (select public.my_clique_ids())
);
create policy clique_members_mute on public.clique_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- reactions: the athlete and the sender see a cheer. Who may cheer is decided by can_cheer().
grant select, delete on public.reactions to authenticated;
grant insert (checkin_id, type, body) on public.reactions to authenticated;
create policy reactions_select on public.reactions for select to authenticated using (
  sender_id = (select auth.uid())
  or exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = (select auth.uid()))
);
create policy reactions_insert on public.reactions for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.can_cheer(checkin_id));
create policy reactions_delete on public.reactions for delete to authenticated using (sender_id = (select auth.uid()));

-- nudges: private between the two friends.
grant select on public.nudges to authenticated;
grant insert (recipient_id, body) on public.nudges to authenticated;
create policy nudges_select on public.nudges for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
create policy nudges_insert on public.nudges for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.can_nudge(recipient_id));

grant select on public.trophy_awards to authenticated;
create policy trophy_awards_select on public.trophy_awards for select to authenticated using (
  (user_id is not null and public.can_see(user_id)) or clique_id in (select public.my_clique_ids())
);

-- push_subscriptions: written through save_push_subscription(), which also reassigns a shared device.
grant select, delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_owner on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()));

grant select on public.invites to authenticated;
create policy invites_select on public.invites for select to authenticated using (inviter_id = (select auth.uid()));

-- notifications: server only. No grants.
