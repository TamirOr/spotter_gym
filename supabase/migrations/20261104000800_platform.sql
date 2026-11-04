-- Supabase platform wiring: avatar storage and scheduled jobs. Each block is skipped where the platform
-- piece is missing (plain Postgres in tests), so the rest of the schema stays testable anywhere.

-- Calls the push-dispatch Edge Function. The URL and shared secret live in Supabase Vault, set once per
-- project (see docs/setup.md). Without them the call is skipped, so a fresh project never errors.
create function public.invoke_push_dispatch() returns void
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
    url := v_url || '/functions/v1/push-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb
  );
end $$;

do $platform$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    -- Photos are resized to 512 px on the device before upload. Each user writes only their own folder.
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
    on conflict (id) do nothing;

    create policy avatars_insert_own on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
    create policy avatars_update_own on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
    create policy avatars_delete_own on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;

  -- Live status: realtime applies the same row rules as queries, so clients only hear about visible rows.
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.checkins, public.reactions, public.clique_members;
  end if;

  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;

    perform cron.schedule('enqueue-plan-reminders', '*/5 * * * *', 'select public.enqueue_plan_reminders()');
    perform cron.schedule('enqueue-missed-plan-reminders', '*/15 * * * *', 'select public.enqueue_missed_plan_reminders()');
    perform cron.schedule('push-dispatch', '* * * * *', 'select public.invoke_push_dispatch()');
    perform cron.schedule('prune-notifications', '17 3 * * *', 'select public.prune_notifications()');
  end if;
end
$platform$;
