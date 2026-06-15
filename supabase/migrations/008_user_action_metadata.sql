-- Implicit behavior metadata + extended event kinds (emotion proxy vessel)

alter table public.user_action_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.user_action_events
  drop constraint if exists user_action_events_event_check;

alter table public.user_action_events
  add constraint user_action_events_event_check
  check (event in ('impression', 'click', 'skip', 'dismiss', 'defer', 'yield'));

alter table public.user_link_states
  drop constraint if exists user_link_states_lifecycle_state_check;

alter table public.user_link_states
  add constraint user_link_states_lifecycle_state_check
  check (lifecycle_state in ('saved', 'opened', 'compared', 'decided', 'done', 'undone'));

-- Generic append-only action event (defer / dismiss / yield / skip with metadata)
create or replace function public.record_user_action_event(
  p_session_id text,
  p_user_id uuid default null,
  p_link_id text default null,
  p_context_bin text default 'day|default',
  p_action_key text default null,
  p_action_family text default 'save_open',
  p_domain text default null,
  p_domain_family text default 'generic',
  p_link_category text default null,
  p_route_mode text default null,
  p_event text default 'skip',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    raise exception 'session_id is required';
  end if;

  if p_action_key is null then
    raise exception 'action_key is required';
  end if;

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
    event,
    metadata
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
    p_event,
    coalesce(p_metadata, '{}'::jsonb)
  );

  if p_link_id is not null and p_event = 'skip' and coalesce(p_metadata->>'is_undone', 'false') = 'true' then
    update public.user_link_states
    set
      lifecycle_state = 'undone',
      updated_at = timezone('utc', now())
    where link_id = p_link_id
      and (
        (p_user_id is not null and user_id = p_user_id)
        or (p_user_id is null and user_id is null and session_id = p_session_id)
      );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Extend click RPC to persist metadata on the same row (body unchanged except metadata param)
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
  p_route_mode text default null,
  p_metadata jsonb default '{}'::jsonb
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
    event,
    metadata
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
    'click',
    coalesce(p_metadata, '{}'::jsonb)
  );

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
