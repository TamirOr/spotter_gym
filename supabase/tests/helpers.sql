-- Test helpers, loaded after the migrations. Each test file runs in a transaction that is rolled back.
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

create schema test;
grant usage on schema test to anon, authenticated, service_role;

-- A user who signed up and is waiting for approval. Signing up creates the profile.
create function test.pending_user(p_name text) returns uuid
language sql as $$
  insert into auth.users (email, raw_user_meta_data)
  values (lower(p_name) || '@example.com', jsonb_build_object('full_name', p_name))
  returning id
$$;

-- A signed-up, approved user.
create function test.user(p_name text) returns uuid
language plpgsql as $$
declare
  v_id uuid := test.pending_user(p_name);
begin
  update public.profiles set approval = 'approved', approved_at = now() where id = v_id;
  return v_id;
end $$;

create function test.admin(p_name text) returns uuid
language plpgsql as $$
declare
  v_id uuid := test.user(p_name);
begin
  update public.profiles set is_admin = true where id = v_id;
  return v_id;
end $$;

-- A test user's id by name, usable inside test.fails() statements while signed in.
create function test.user_id(p_name text) returns uuid
language sql stable security definer as $$
  select id from public.profiles where email = lower(p_name) || '@example.com'
$$;

create function test.befriend(p_a uuid, p_b uuid) returns void
language sql as $$
  insert into public.friendships (user_low, user_high, status, requested_by)
  values (least(p_a, p_b), greatest(p_a, p_b), 'accepted', p_a)
$$;

-- A clique owned by the first member, with every listed user active in it.
create function test.clique(p_name text, p_members uuid[]) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.cliques (name, owner_id) values (p_name, p_members[1]) returning id into v_id;
  insert into public.clique_members (clique_id, user_id, status, joined_at)
  select v_id, m, 'active', now() from unnest(p_members[2:]) as m;
  return v_id;
end $$;

create function test.activity(p_name text) returns uuid
language sql stable as $$
  select id from public.activities where owner_id is null and name = p_name
$$;

-- Switch the signed-in user. Pair with `set role authenticated` in the test.
create function test.login(p_user uuid) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, true)
$$;
grant execute on function test.login(uuid) to authenticated;

create function test.ok(p_condition boolean, p_message text) returns void
language plpgsql as $$
begin
  if p_condition is distinct from true then
    raise exception 'FAILED: %', p_message;
  end if;
end $$;

create function test.eq(p_actual anyelement, p_expected anyelement, p_message text) returns void
language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAILED: % (expected %, got %)', p_message, p_expected, p_actual;
  end if;
end $$;

-- Runs a statement that must fail with an error message containing p_expected.
create function test.fails(p_sql text, p_expected text, p_message text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_expected in sqlerrm) = 0 then
      raise exception 'FAILED: % (expected error "%", got "%")', p_message, p_expected, sqlerrm;
    end if;
    return;
  end;
  raise exception 'FAILED: % (expected error "%", but it succeeded)', p_message, p_expected;
end $$;

grant execute on all functions in schema test to anon, authenticated;
