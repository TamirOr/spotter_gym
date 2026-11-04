-- Spotter core schema. Table and column names follow the "Data model" section of the spec.
-- Check-ins are the source of truth: progress, streaks and leaderboards are derived from them.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- Enums ----------------------------------------------------------------------

create type public.app_language as enum ('he', 'en');
create type public.friendship_status as enum ('pending', 'accepted', 'blocked');
create type public.activity_kind as enum ('strength', 'endurance', 'sport', 'mobility', 'other');
create type public.goal_metric as enum ('sessions', 'distance_km', 'steps');
create type public.goal_period as enum ('day', 'week', 'month');
create type public.goal_visibility as enum ('shared', 'private');
create type public.plan_exception_action as enum ('skip', 'move');
create type public.checkin_state as enum ('going', 'done', 'cancelled');
create type public.checkin_source as enum ('manual', 'place');
create type public.metric_source as enum ('manual', 'health');
create type public.clique_role as enum ('owner', 'member');
create type public.clique_member_status as enum ('invited', 'active', 'left');
-- A cheer is stored as a type, not as text, so each reader sees it in their own language.
create type public.reaction_type as enum ('muscle', 'fire', 'clap', 'trophy', 'yalla', 'well_done', 'champ', 'note');
create type public.notification_kind as enum (
  'going', 'done', 'cheer', 'friend_invite', 'clique_invite', 'plan_reminder', 'plan_missed', 'nudge'
);

-- People ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  -- Used for sign-in and exact-match search only. Column grants keep it unreadable to other users.
  email text not null,
  avatar_url text,
  language public.app_language not null default 'he',
  time_zone text not null default 'Asia/Jerusalem',
  -- 'infinity' means paused with no end date.
  paused_until date,
  automation_token_hash text,
  -- Set when the user redeems an invite. Sign-up is invite-only while the app is private.
  joined_at timestamptz,
  -- Set by the app when first-run setup is finished.
  onboarded_at timestamptz,
  nudges_enabled boolean not null default true,
  muted_notification_kinds public.notification_kind[] not null default '{}',
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '07:00',
  going_ignores_quiet_hours boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per friendship: the sorted pair keeps (a, b) and (b, a) from both existing.
create table public.friendships (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  requested_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high))
);
create index friendships_user_high_idx on public.friendships (user_high);

-- Activities -----------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  -- Null for presets, which migrations insert outside any user session.
  owner_id uuid default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  name_he text,
  normalized_name text not null,
  -- Normalized alternative names, in any language: 'weights', 'lifting', 'חדר כושר' all mean Gym.
  aliases text[] not null default '{}',
  kind public.activity_kind not null default 'other',
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, normalized_name)
);
create index activities_normalized_trgm_idx on public.activities using gin (normalized_name extensions.gin_trgm_ops);
create index activities_aliases_idx on public.activities using gin (aliases);

-- Goals and plan -------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id),
  metric public.goal_metric not null default 'sessions',
  target numeric not null check (target > 0),
  period public.goal_period not null default 'week',
  visibility public.goal_visibility not null default 'shared',
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index goals_user_idx on public.goals (user_id);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  min_stay_min integer not null default 30 check (min_stay_min between 5 and 600),
  -- The current visit only; cleared after each visit. No coordinates are ever stored.
  arrived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.place_activities (
  place_id uuid not null references public.places (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  primary key (place_id, activity_id)
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id),
  place_id uuid references public.places (id) on delete set null,
  time time,
  -- Subset of iCal RRULE; see public.rrule_occurs_on. Null means a single workout on starts_on.
  rrule text check (
    rrule ~ '^FREQ=WEEKLY(;INTERVAL=[1-9])?;BYDAY=(SU|MO|TU|WE|TH|FR|SA)(,(SU|MO|TU|WE|TH|FR|SA))*$'
    or rrule ~ '^FREQ=MONTHLY;BYMONTHDAY=([1-9]|[12][0-9]|3[01])$'
  ),
  starts_on date not null default current_date,
  reminder_lead_min integer check (reminder_lead_min between 0 and 1440),
  created_at timestamptz not null default now(),
  -- Plans lock when the week starts: a removed item still counts for weeks that began before removal.
  deleted_at timestamptz
);
create index plan_items_user_idx on public.plan_items (user_id) where deleted_at is null;

create table public.plan_exceptions (
  plan_item_id uuid not null references public.plan_items (id) on delete cascade,
  occurs_on date not null,
  action public.plan_exception_action not null,
  new_date date,
  primary key (plan_item_id, occurs_on),
  check ((action = 'move') = (new_date is not null))
);

-- Check-ins and metrics ------------------------------------------------------

create table public.checkins (
  -- Generated by the app, so a retry after poor gym reception cannot create a duplicate.
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id),
  plan_item_id uuid references public.plan_items (id) on delete set null,
  place_id uuid references public.places (id) on delete set null,
  state public.checkin_state not null,
  source public.checkin_source not null default 'manual',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- The user's local day the workout happened on; set by trigger from the profile time zone.
  local_day date not null,
  duration_min integer check (duration_min between 1 and 1440),
  distance_km numeric(6, 2) check (distance_km > 0 and distance_km < 1000),
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  check ((state = 'done') = (ended_at is not null))
);
create index checkins_user_day_idx on public.checkins (user_id, local_day);
-- At most one workout in progress per user.
create unique index checkins_one_going_idx on public.checkins (user_id) where state = 'going';

create table public.daily_metrics (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null,
  steps integer check (steps >= 0),
  distance_km numeric(6, 2) check (distance_km >= 0),
  floors integer check (floors >= 0),
  source public.metric_source not null default 'health',
  primary key (user_id, day)
);

-- Cliques --------------------------------------------------------------------

create table public.cliques (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  photo_url text,
  owner_id uuid not null default auth.uid() references public.profiles (id),
  -- Sets when the weekly leaderboard resets (Sunday 00:00 local).
  time_zone text not null default 'Asia/Jerusalem',
  created_at timestamptz not null default now()
);

create table public.clique_members (
  clique_id uuid not null references public.cliques (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.clique_role not null default 'member',
  status public.clique_member_status not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  muted boolean not null default false,
  joined_at timestamptz,
  primary key (clique_id, user_id)
);
create index clique_members_user_idx on public.clique_members (user_id) where status = 'active';

-- Social ---------------------------------------------------------------------

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  -- Null once the sender deletes their account; shown as "Former member".
  sender_id uuid default auth.uid() references public.profiles (id) on delete set null,
  type public.reaction_type not null,
  body text check (char_length(btrim(body)) between 1 and 140),
  created_at timestamptz not null default now(),
  check ((type = 'note') = (body is not null))
);
-- One quick cheer per sender and check-in. Notes are not limited.
create unique index reactions_one_cheer_idx on public.reactions (checkin_id, sender_id) where type <> 'note';

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- The recipient's local day.
  day date not null,
  -- Null means the 🤏 emoji.
  body text check (char_length(btrim(body)) between 1 and 140),
  created_at timestamptz not null default now(),
  unique (sender_id, recipient_id, day),
  check (sender_id <> recipient_id)
);

create table public.trophy_awards (
  id uuid primary key default gen_random_uuid(),
  -- Trophy definitions live in versioned configuration; only awards are stored.
  trophy_key text not null,
  user_id uuid references public.profiles (id) on delete cascade,
  clique_id uuid references public.cliques (id) on delete cascade,
  earned_at timestamptz not null default now(),
  check ((user_id is null) <> (clique_id is null))
);
create unique index trophy_awards_user_idx on public.trophy_awards (trophy_key, user_id) where user_id is not null;
create unique index trophy_awards_clique_idx on public.trophy_awards (trophy_key, clique_id) where clique_id is not null;

-- Infrastructure -------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.invites (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  clique_id uuid references public.cliques (id) on delete cascade,
  used_by uuid references public.profiles (id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);

-- Outbox for web pushes. The push-dispatch Edge Function drains due rows, grouping by recipient and group_key.
create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  -- Ids and display names only. Push text is written by the dispatcher in the recipient's language.
  payload jsonb not null default '{}',
  group_key text not null,
  -- Prevents scheduled reminders from being enqueued twice.
  dedupe_key text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, kind, dedupe_key)
);
create index notifications_due_idx on public.notifications (send_after) where sent_at is null;
