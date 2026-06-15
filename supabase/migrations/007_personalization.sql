-- Rimvio: personalization events, link lifecycle, recent-click profile (MVP)
-- Race-safe profile updates via advisory locks + single RPC entrypoint.

-- ---------------------------------------------------------------------------
-- 1. Append-only action events
-- ---------------------------------------------------------------------------
create table if not exists public.user_action_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  session_id text not null,
  link_id text,
  context_bin text not null,
  action_key text not null,
  action_family text not null,
  domain text,
  domain_family text not null,
  link_category text,
  route_mode text,
  event text not null check (event in ('impression', 'click', 'skip')),
  ts timestamptz not null default timezone('utc', now())
);

create index if not exists user_action_events_user_ts_idx
  on public.user_action_events (user_id, ts desc)
  where user_id is not null;

create index if not exists user_action_events_session_ts_idx
  on public.user_action_events (session_id, ts desc);

create index if not exists user_action_events_link_idx
  on public.user_action_events (link_id, ts desc)
  where link_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Per-link lifecycle state (guest session OR authenticated user)
-- ---------------------------------------------------------------------------
create table if not exists public.user_link_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  session_id text not null,
  link_id text not null,
  domain_family text not null,
  link_category text,
  lifecycle_state text not null default 'saved'
    check (lifecycle_state in ('saved', 'opened', 'compared', 'decided', 'done')),
  first_saved_at timestamptz not null default timezone('utc', now()),
  last_opened_at timestamptz,
  last_action_family text,
  last_action_at timestamptz,
  reopen_count integer not null default 0 check (reopen_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_link_states_user_link_unique
  on public.user_link_states (user_id, link_id)
  where user_id is not null;

create unique index if not exists user_link_states_session_link_unique
  on public.user_link_states (session_id, link_id)
  where user_id is null;

create index if not exists user_link_states_user_updated_idx
  on public.user_link_states (user_id, updated_at desc)
  where user_id is not null;

create index if not exists user_link_states_session_updated_idx
  on public.user_link_states (session_id, updated_at desc)
  where user_id is null;

-- ---------------------------------------------------------------------------
-- 3. Rolling recent-click profile (max 10), one row per user OR guest session
-- ---------------------------------------------------------------------------
create table if not exists public.user_recent_action_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  session_id text,
  recent_clicks jsonb not null default '[]'::jsonb,
  family_counts jsonb not null default '{}'::jsonb,
  domain_affinity jsonb not null default '{}'::jsonb,
  click_total integer not null default 0 check (click_total >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_recent_action_profile_owner_check check (
    user_id is not null or session_id is not null
  )
);

create unique index if not exists user_recent_action_profile_user_unique
  on public.user_recent_action_profile (user_id)
  where user_id is not null;

create unique index if not exists user_recent_action_profile_session_unique
  on public.user_recent_action_profile (session_id)
  where user_id is null and session_id is not null;

-- ---------------------------------------------------------------------------
-- RLS (append + read for anon/authenticated — tighten per product policy)
-- ---------------------------------------------------------------------------
alter table public.user_action_events enable row level security;
alter table public.user_link_states enable row level security;
alter table public.user_recent_action_profile enable row level security;

create policy "Public read personalization events"
  on public.user_action_events for select to anon, authenticated using (true);

create policy "Public insert personalization events"
  on public.user_action_events for insert to anon, authenticated with check (true);

create policy "Public read link states"
  on public.user_link_states for select to anon, authenticated using (true);

create policy "Public insert link states"
  on public.user_link_states for insert to anon, authenticated with check (true);

create policy "Public update link states"
  on public.user_link_states for update to anon, authenticated using (true);

create policy "Public read recent profiles"
  on public.user_recent_action_profile for select to anon, authenticated using (true);

create policy "Public insert recent profiles"
  on public.user_recent_action_profile for insert to anon, authenticated with check (true);

create policy "Public update recent profiles"
  on public.user_recent_action_profile for update to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Helpers: recompute domain affinity from recent_clicks json array
-- ---------------------------------------------------------------------------
create or replace function public._personalization_recompute_domain_affinity(p_clicks jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_total numeric := 0;
  v_counts jsonb := '{}'::jsonb;
  v_item jsonb;
  v_domain text;
  v_weight numeric;
  v_key text;
  v_result jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p_clicks) <> 'array' then
    return '{}'::jsonb;
  end if;

  for v_item in select value from jsonb_array_elements(p_clicks)
  loop
    v_domain := coalesce(v_item ->> 'domain_family', 'generic');
    v_weight := coalesce((v_item ->> 'weight')::numeric, 1);
    v_total := v_total + v_weight;
    v_counts := v_counts || jsonb_build_object(
      v_domain,
      coalesce((v_counts ->> v_domain)::numeric, 0) + v_weight
    );
  end loop;

  if v_total <= 0 then
    return '{}'::jsonb;
  end if;

  for v_key, v_weight in
    select key, value::numeric from jsonb_each_text(v_counts)
  loop
    v_result := v_result || jsonb_build_object(v_key, round(v_weight / v_total, 4));
  end loop;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: record click + atomically refresh recent profile (race-safe)
-- Uses transaction-scoped advisory lock keyed by owner (user_id or session_id).
-- ---------------------------------------------------------------------------
create or replace function public.record_personalization_click(
  p_session_id text,
  p_user_id uuid default null,
  p_link_id text default null,
  p_context_bin text default 'day|default',
  p_action_key text default null,
  p_action_family text default null,
  p_domain text default null,
  p_domain_family text default 'generic',
  p_link_category text default null,
  p_route_mode text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_key bigint;
  v_profile public.user_recent_action_profile%rowtype;
  v_clicks jsonb;
  v_entry jsonb;
  v_family_counts jsonb;
  v_family text;
  v_i int;
  v_weight numeric;
  v_new_entry jsonb;
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'session_id is required';
  end if;

  if p_action_key is null or p_action_family is null then
    raise exception 'action_key and action_family are required';
  end if;

  -- Serialize profile updates per owner within this transaction.
  v_lock_key := hashtext(coalesce(p_user_id::text, p_session_id));
  perform pg_advisory_xact_lock(v_lock_key);

  insert into public.user_action_events (
    user_id,
    session_id,
    link_id,
    context_bin,
    action_key,
    action_family,
    domain,
    domain_family,
    link_category,
    route_mode,
    event
  )
  values (
    p_user_id,
    p_session_id,
    p_link_id,
    p_context_bin,
    p_action_key,
    p_action_family,
    p_domain,
    p_domain_family,
    p_link_category,
    p_route_mode,
    'click'
  );

  -- Upsert profile row (user row takes precedence over session row).
  if p_user_id is not null then
    insert into public.user_recent_action_profile as prof (
      user_id,
      session_id,
      recent_clicks,
      family_counts,
      domain_affinity,
      click_total,
      updated_at
    )
    values (
      p_user_id,
      p_session_id,
      '[]'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      0,
      timezone('utc', now())
    )
    on conflict (user_id) where user_id is not null
    do nothing;

    select * into v_profile
    from public.user_recent_action_profile
    where user_id = p_user_id
    for update;
  else
    insert into public.user_recent_action_profile as prof (
      user_id,
      session_id,
      recent_clicks,
      family_counts,
      domain_affinity,
      click_total,
      updated_at
    )
    values (
      null,
      p_session_id,
      '[]'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      0,
      timezone('utc', now())
    )
    on conflict (session_id) where user_id is null and session_id is not null
    do nothing;

    select * into v_profile
    from public.user_recent_action_profile
    where user_id is null and session_id = p_session_id
    for update;
  end if;

  v_new_entry := jsonb_build_object(
    'action_family', p_action_family,
    'domain_family', p_domain_family,
    'context_bin', p_context_bin,
    'weight', 1,
    'ts', to_jsonb(timezone('utc', now()))
  );

  v_clicks := coalesce(v_profile.recent_clicks, '[]'::jsonb);
  v_clicks := jsonb_build_array(v_new_entry) || v_clicks;
  v_clicks := (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from (
      select elem
      from jsonb_array_elements(v_clicks) with ordinality as t(elem, ord)
      where ord <= 10
    ) sliced
  );

  -- Re-apply recency weights: weight = exp(-0.35 * index)
  v_clicks := (
    select coalesce(jsonb_agg(
      (elem - 'weight') || jsonb_build_object(
        'weight',
        round(exp(-0.35 * greatest(0, idx - 1))::numeric, 4)
      )
    ), '[]'::jsonb)
    from (
      select elem, row_number() over () as idx
      from jsonb_array_elements(v_clicks) as elem
    ) weighted
  );

  v_family_counts := coalesce(v_profile.family_counts, '{}'::jsonb);
  v_family := p_action_family;
  v_family_counts := v_family_counts || jsonb_build_object(
    v_family,
    coalesce((v_family_counts ->> v_family)::integer, 0) + 1
  );

  update public.user_recent_action_profile
  set
    recent_clicks = v_clicks,
    family_counts = v_family_counts,
    domain_affinity = public._personalization_recompute_domain_affinity(v_clicks),
    click_total = click_total + 1,
    updated_at = timezone('utc', now())
  where id = v_profile.id;

  -- Link lifecycle transition on click
  if p_link_id is not null then
    perform public._personalization_transition_link_state(
      p_session_id,
      p_user_id,
      p_link_id,
      p_action_family,
      p_domain_family,
      p_link_category,
      false
    );
  end if;

  return jsonb_build_object(
    'recent_clicks', v_clicks,
    'family_counts', v_family_counts,
    'domain_affinity', public._personalization_recompute_domain_affinity(v_clicks),
    'click_total', v_profile.click_total + 1
  );
end;
$$;

-- Internal: lifecycle state machine transition
create or replace function public._personalization_transition_link_state(
  p_session_id text,
  p_user_id uuid,
  p_link_id text,
  p_action_family text,
  p_domain_family text default 'generic',
  p_link_category text default null,
  p_is_reopen boolean default false
)
returns public.user_link_states
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.user_link_states%rowtype;
  v_next_state text;
begin
  if p_user_id is not null then
    select * into v_state
    from public.user_link_states
    where user_id = p_user_id and link_id = p_link_id
    for update;

    if not found then
      insert into public.user_link_states (
        user_id,
        session_id,
        link_id,
        domain_family,
        link_category,
        lifecycle_state,
        reopen_count
      )
      values (
        p_user_id,
        p_session_id,
        p_link_id,
        p_domain_family,
        p_link_category,
        'saved',
        case when p_is_reopen then 1 else 0 end
      )
      returning * into v_state;
    end if;
  else
    select * into v_state
    from public.user_link_states
    where user_id is null and session_id = p_session_id and link_id = p_link_id
    for update;

    if not found then
      insert into public.user_link_states (
        user_id,
        session_id,
        link_id,
        domain_family,
        link_category,
        lifecycle_state,
        reopen_count
      )
      values (
        null,
        p_session_id,
        p_link_id,
        p_domain_family,
        p_link_category,
        'saved',
        case when p_is_reopen then 1 else 0 end
      )
      returning * into v_state;
    end if;
  end if;

  if p_is_reopen then
    update public.user_link_states
    set
      reopen_count = reopen_count + 1,
      last_opened_at = timezone('utc', now()),
      lifecycle_state = case
        when lifecycle_state = 'saved' then 'opened'
        else lifecycle_state
      end,
      updated_at = timezone('utc', now())
    where id = v_state.id
    returning * into v_state;

    return v_state;
  end if;

  v_next_state := v_state.lifecycle_state;

  case p_action_family
    when 'save_open' then
      if v_next_state = 'saved' then v_next_state := 'opened'; end if;
    when 'price_compare' then
      v_next_state := 'compared';
    when 'review_decide', 'summary_read' then
      if v_next_state in ('opened', 'compared') then v_next_state := 'decided'; end if;
    when 'done_close' then
      v_next_state := 'done';
    else
      null;
  end case;

  update public.user_link_states
  set
    lifecycle_state = v_next_state,
    last_action_family = p_action_family,
    last_action_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_state.id
  returning * into v_state;

  return v_state;
end;
$$;

-- RPC: record link reopen (feed slide becomes active)
create or replace function public.record_link_reopen(
  p_session_id text,
  p_link_id text,
  p_user_id uuid default null,
  p_domain_family text default 'generic',
  p_link_category text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.user_link_states;
begin
  v_state := public._personalization_transition_link_state(
    p_session_id,
    p_user_id,
    p_link_id,
    'save_open',
    p_domain_family,
    p_link_category,
    true
  );

  return to_jsonb(v_state);
end;
$$;

-- RPC: merge guest session data into authenticated user on signup/login
create or replace function public.merge_guest_personalization(
  p_session_id text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_profile public.user_recent_action_profile%rowtype;
  v_user_profile public.user_recent_action_profile%rowtype;
  v_merged_clicks jsonb;
  v_merged_counts jsonb := '{}'::jsonb;
  v_key text;
  v_guest_val integer;
  v_user_val integer;
  v_events_merged integer := 0;
  v_states_merged integer := 0;
begin
  if p_session_id is null or p_user_id is null then
    raise exception 'session_id and user_id are required';
  end if;

  perform pg_advisory_xact_lock(hashtext('merge:' || p_user_id::text || ':' || p_session_id));

  -- Re-attribute anonymous events
  update public.user_action_events
  set user_id = p_user_id
  where session_id = p_session_id and user_id is null;
  get diagnostics v_events_merged = row_count;

  -- Merge link states: guest -> user, prefer progressed lifecycle
  insert into public.user_link_states (
    user_id,
    session_id,
    link_id,
    domain_family,
    link_category,
    lifecycle_state,
    first_saved_at,
    last_opened_at,
    last_action_family,
    last_action_at,
    reopen_count,
    updated_at
  )
  select
    p_user_id,
    p_session_id,
    g.link_id,
    g.domain_family,
    g.link_category,
    g.lifecycle_state,
    g.first_saved_at,
    g.last_opened_at,
    g.last_action_family,
    g.last_action_at,
    g.reopen_count,
    timezone('utc', now())
  from public.user_link_states g
  where g.session_id = p_session_id and g.user_id is null
  on conflict (user_id, link_id) where user_id is not null
  do update set
    lifecycle_state = case
      when excluded.lifecycle_state = 'done'
        or user_link_states.lifecycle_state = 'done' then 'done'
      when excluded.lifecycle_state = 'decided'
        or user_link_states.lifecycle_state = 'decided' then 'decided'
      when excluded.lifecycle_state = 'compared'
        or user_link_states.lifecycle_state = 'compared' then 'compared'
      when excluded.lifecycle_state = 'opened'
        or user_link_states.lifecycle_state = 'opened' then 'opened'
      else user_link_states.lifecycle_state
    end,
    reopen_count = greatest(user_link_states.reopen_count, excluded.reopen_count),
    last_opened_at = greatest(
      coalesce(user_link_states.last_opened_at, '-infinity'::timestamptz),
      coalesce(excluded.last_opened_at, '-infinity'::timestamptz)
    ),
    last_action_at = greatest(
      coalesce(user_link_states.last_action_at, '-infinity'::timestamptz),
      coalesce(excluded.last_action_at, '-infinity'::timestamptz)
    ),
    updated_at = timezone('utc', now());

  delete from public.user_link_states
  where session_id = p_session_id and user_id is null;
  get diagnostics v_states_merged = row_count;

  -- Merge recent profiles
  select * into v_guest_profile
  from public.user_recent_action_profile
  where user_id is null and session_id = p_session_id;

  select * into v_user_profile
  from public.user_recent_action_profile
  where user_id = p_user_id
  for update;

  if v_user_profile.id is null then
    insert into public.user_recent_action_profile (
      user_id,
      session_id,
      recent_clicks,
      family_counts,
      domain_affinity,
      click_total,
      updated_at
    )
    values (
      p_user_id,
      p_session_id,
      '[]'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      0,
      timezone('utc', now())
    )
    returning * into v_user_profile;
  end if;

  if v_guest_profile.id is not null then
    v_merged_clicks := coalesce(v_guest_profile.recent_clicks, '[]'::jsonb)
      || coalesce(v_user_profile.recent_clicks, '[]'::jsonb);

    v_merged_clicks := (
      select coalesce(jsonb_agg(elem), '[]'::jsonb)
      from (
        select elem
        from jsonb_array_elements(v_merged_clicks) as elem
        order by (elem ->> 'ts')::timestamptz desc nulls last
        limit 10
      ) ordered
    );

    v_merged_counts := coalesce(v_user_profile.family_counts, '{}'::jsonb);
    for v_key in select jsonb_object_keys(coalesce(v_guest_profile.family_counts, '{}'::jsonb))
    loop
      v_guest_val := coalesce((v_guest_profile.family_counts ->> v_key)::integer, 0);
      v_user_val := coalesce((v_merged_counts ->> v_key)::integer, 0);
      v_merged_counts := v_merged_counts || jsonb_build_object(v_key, v_guest_val + v_user_val);
    end loop;

    update public.user_recent_action_profile
    set
      recent_clicks = v_merged_clicks,
      family_counts = v_merged_counts,
      domain_affinity = public._personalization_recompute_domain_affinity(v_merged_clicks),
      click_total = v_user_profile.click_total + v_guest_profile.click_total,
      session_id = p_session_id,
      updated_at = timezone('utc', now())
    where id = v_user_profile.id;

    delete from public.user_recent_action_profile
    where id = v_guest_profile.id;
  end if;

  return jsonb_build_object(
    'events_merged', v_events_merged,
    'states_merged', v_states_merged,
    'profile_merged', v_guest_profile.id is not null
  );
end;
$$;

grant execute on function public.record_personalization_click(
  text, uuid, text, text, text, text, text, text, text, text
) to anon, authenticated;

grant execute on function public.record_link_reopen(
  text, text, uuid, text, text
) to anon, authenticated;

grant execute on function public.merge_guest_personalization(text, uuid)
  to anon, authenticated;
