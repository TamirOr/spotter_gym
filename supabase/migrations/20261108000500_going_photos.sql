-- One-time Going photos. Whoever taps Going may add one photo for their clique. Each clique-mate can open
-- it once, then cheer. The file is deleted as soon as everyone has seen it, when its workout is cancelled,
-- or a day after it was taken, so storage holds at most one small photo per workout, briefly.
--
-- Flow: the app uploads the photo to going-photos/<user>/<checkin>.jpg, then calls attach_going_photo().
-- A viewer calls open_going_photo(), which records the viewing and lets that viewer download the file for
-- one minute. The photo-sweep Edge Function deletes due files with the Storage API (Postgres may not
-- delete storage objects directly) and confirms with mark_going_photos_removed().

-- Constants ------------------------------------------------------------------

create function public.going_photo_lifetime() returns interval
language sql immutable set search_path = '' as $$ select interval '24 hours' $$;

-- How long an opened photo stays downloadable for the person who opened it. Opening is the one look.
create function public.photo_view_window() returns interval
language sql immutable set search_path = '' as $$ select interval '1 minute' $$;

-- An uploaded file with no photo row (the attach call never arrived, or the workout was deleted) is
-- removed after this long.
create function public.orphan_photo_age() returns interval
language sql immutable set search_path = '' as $$ select interval '1 hour' $$;

-- The app builds the same path before uploading (src/features/photos/photos.ts).
create function public.going_photo_path(p_user_id uuid, p_checkin_id uuid) returns text
language sql immutable set search_path = '' as $$ select p_user_id::text || '/' || p_checkin_id::text || '.jpg' $$;

-- Tables ---------------------------------------------------------------------

-- One photo per Going. The row outlives its file (removed_at), so the owner still sees who opened it
-- and cannot add a second photo to the same workout.
create table public.going_photos (
  checkin_id uuid primary key references public.checkins (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + public.going_photo_lifetime(),
  -- Set once the sweeper has deleted the file.
  removed_at timestamptz
);
create index going_photos_due_idx on public.going_photos (expires_at) where removed_at is null;

-- One viewing per person and photo.
create table public.photo_views (
  checkin_id uuid not null references public.going_photos (checkin_id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (checkin_id, viewer_id)
);
create index photo_views_viewer_idx on public.photo_views (viewer_id);

-- Rules ----------------------------------------------------------------------

-- A photo can be opened while its file exists, it has not expired and its workout was not cancelled.
create function public.going_photo_is_live(p_checkin_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.going_photos p
    join public.checkins c on c.id = p.checkin_id
    where p.checkin_id = p_checkin_id
      and p.removed_at is null
      and p.expires_at > now()
      and c.state <> 'cancelled'
  )
$$;

-- The photo is for clique-mates only: not friends outside the clique, and not its owner.
create function public.can_open_going_photo(p_checkin_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member()
    and public.going_photo_is_live(p_checkin_id)
    and exists (
      select 1 from public.going_photos p
      where p.checkin_id = p_checkin_id and p.user_id <> auth.uid() and public.shares_clique(p.user_id)
    )
$$;

-- Storage rule for uploads: only to my own open Going's path, and only once.
create function public.can_upload_going_photo(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member()
    and exists (
      select 1 from public.checkins c
      where c.user_id = auth.uid()
        and c.state = 'going'
        and public.going_is_active(c.started_at)
        and public.going_photo_path(c.user_id, c.id) = p_path
    )
    and not exists (select 1 from public.going_photos p where p.path = p_path)
$$;

-- Storage rule for downloads: the owner's own folder, or a viewer within the minute after opening it.
create function public.can_download_going_photo(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(p_path, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.going_photos p
      join public.photo_views v on v.checkin_id = p.checkin_id
      where p.path = p_path
        and v.viewer_id = auth.uid()
        and v.opened_at > now() - public.photo_view_window()
        and public.can_open_going_photo(p.checkin_id)
    )
$$;

grant execute on function
  public.can_open_going_photo(uuid),
  public.can_upload_going_photo(text),
  public.can_download_going_photo(text)
to authenticated;

-- RPCs -----------------------------------------------------------------------

-- Called after the upload. Retrying is safe.
create function public.attach_going_photo(p_checkin_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
begin
  if not exists (
    select 1 from public.checkins c
    where c.id = p_checkin_id and c.user_id = v_me and c.state = 'going' and public.going_is_active(c.started_at)
  ) then
    perform public.fail('not_found');
  end if;
  insert into public.going_photos (checkin_id, user_id, path)
  values (p_checkin_id, v_me, public.going_photo_path(v_me, p_checkin_id))
  on conflict (checkin_id) do nothing;
end $$;
grant execute on function public.attach_going_photo(uuid) to authenticated;

-- The one look: records the viewing and returns the path, which this viewer may download for a minute.
-- Calling again inside that minute is a retry of the same look; after it, the photo is spent.
create function public.open_going_photo(p_checkin_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.require_user();
  v_opened_at timestamptz;
begin
  if not public.can_open_going_photo(p_checkin_id) then
    perform public.fail('photo_unavailable');
  end if;

  insert into public.photo_views (checkin_id, viewer_id) values (p_checkin_id, v_me)
  on conflict (checkin_id, viewer_id) do nothing;
  select opened_at into v_opened_at from public.photo_views where checkin_id = p_checkin_id and viewer_id = v_me;
  if v_opened_at <= now() - public.photo_view_window() then
    perform public.fail('photo_already_seen');
  end if;

  return (select path from public.going_photos where checkin_id = p_checkin_id);
end $$;
grant execute on function public.open_going_photo(uuid) to authenticated;

-- Sweeper (service role only) ------------------------------------------------

-- Everyone who could open the photo: approved, active people sharing an active clique with its owner.
create function public.photo_audience(p_owner_id uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct theirs.user_id
  from public.clique_members mine
  join public.clique_members theirs on theirs.clique_id = mine.clique_id
  where mine.user_id = p_owner_id and mine.status = 'active'
    and theirs.status = 'active' and theirs.user_id <> p_owner_id
    and public.is_member_user(theirs.user_id)
$$;

-- Files due for deletion. A photo is fully seen once every audience member opened it and their download
-- minute has passed. Files are confirmed with mark_going_photos_removed() only after the Storage API
-- deleted them, so a failed run is simply retried.
create function public.going_photos_to_remove(p_limit integer default 100) returns setof text
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select p.path
    from public.going_photos p
    left join public.checkins c on c.id = p.checkin_id
    where p.removed_at is null
      and (
        p.expires_at <= now()
        or c.state = 'cancelled'
        or not exists (
          select 1 from public.photo_audience(p.user_id) as audience(user_id)
          where not exists (
            select 1 from public.photo_views v
            where v.checkin_id = p.checkin_id
              and v.viewer_id = audience.user_id
              and v.opened_at <= now() - public.photo_view_window()
          )
        )
      )
    order by p.created_at
    limit p_limit;

  -- Storage exists on Supabase only; plain Postgres in tests has no files to find.
  if to_regclass('storage.objects') is not null then
    return query execute $sql$
      select o.name from storage.objects o
      where o.bucket_id = 'going-photos'
        and o.created_at < now() - public.orphan_photo_age()
        and not exists (select 1 from public.going_photos p where p.path = o.name and p.removed_at is null)
      order by o.created_at
      limit $1
    $sql$ using p_limit;
  end if;
end $$;

create function public.mark_going_photos_removed(p_paths text[]) returns void
language sql security definer set search_path = '' as $$
  update public.going_photos set removed_at = now() where path = any (p_paths) and removed_at is null
$$;

-- Rows of removed photos are only needed while the owner might still look at their workout.
create function public.prune_going_photos() returns void
language sql security definer set search_path = '' as $$
  delete from public.going_photos where removed_at < now() - interval '7 days'
$$;

grant execute on function
  public.going_photos_to_remove(integer),
  public.mark_going_photos_removed(text[]),
  public.prune_going_photos()
to service_role;

-- Privacy rules --------------------------------------------------------------

alter table public.going_photos enable row level security;
alter table public.photo_views enable row level security;

-- Written only through the RPCs above. The owner sees their photos; clique-mates see live ones.
grant select on public.going_photos to authenticated;
create policy going_photos_select on public.going_photos for select to authenticated
  using (user_id = (select auth.uid()) or public.can_open_going_photo(checkin_id));

-- A viewer sees their own viewings; the owner sees who opened their photo.
grant select on public.photo_views to authenticated;
create policy photo_views_select on public.photo_views for select to authenticated using (
  viewer_id = (select auth.uid())
  or exists (select 1 from public.going_photos p where p.checkin_id = photo_views.checkin_id and p.user_id = (select auth.uid()))
);

-- Platform wiring ------------------------------------------------------------

-- Calls a scheduled Edge Function with the shared secret in Vault (see docs/setup.md). Skipped until the
-- secrets exist, so a fresh project never errors.
create function public.invoke_edge_function(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb
  );
end $$;

create or replace function public.invoke_push_dispatch() returns void
language sql security definer set search_path = '' as $$ select public.invoke_edge_function('push-dispatch') $$;

do $platform$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    -- Private: files are reachable only through the rules below, never by a public URL.
    -- Photos are resized on the device to 1080 px, well under the 1 MB limit.
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('going-photos', 'going-photos', false, 1048576, array['image/jpeg'])
    on conflict (id) do nothing;

    -- No update or delete rules: a photo is never replaced, and only the sweeper deletes files.
    create policy going_photos_upload on storage.objects for insert to authenticated
      with check (bucket_id = 'going-photos' and public.can_upload_going_photo(name));
    create policy going_photos_download on storage.objects for select to authenticated
      using (bucket_id = 'going-photos' and public.can_download_going_photo(name));
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.going_photos, public.photo_views;
  end if;

  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('photo-sweep', '*/10 * * * *', $$select public.invoke_edge_function('photo-sweep')$$);
    perform cron.schedule('prune-going-photos', '37 3 * * *', 'select public.prune_going_photos()');
  end if;
end
$platform$;
