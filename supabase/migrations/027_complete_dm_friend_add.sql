-- Atomic DM friend add (thread + both members + both friend_connections + feed slots).

create or replace function public.complete_dm_friend_add(
  p_other_user_id uuid,
  p_friend_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_a text;
  v_b text;
  v_thread_id text;
  v_now timestamptz := timezone('utc', now());
  v_friend_name text;
  v_caller_name text;
  v_caller_score integer := 0;
  v_other_score integer := 0;
begin
  if v_caller is null then
    raise exception 'Authentication required.';
  end if;
  if p_other_user_id is null or p_other_user_id = v_caller then
    raise exception 'Cannot add self as friend.';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_other_user_id) then
    raise exception 'not_registered:상대가 Rimvio에 가입하지 않았어요.';
  end if;

  if not public.rimvio_ensure_user_profile(v_caller)
     or not public.rimvio_ensure_user_profile(p_other_user_id) then
    raise exception 'not_registered:가입한 Rimvio 사용자만 추가할 수 있어요.';
  end if;

  if v_caller::text < p_other_user_id::text then
    v_a := v_caller::text;
    v_b := p_other_user_id::text;
  else
    v_a := p_other_user_id::text;
    v_b := v_caller::text;
  end if;
  v_thread_id := 'peer-dm-' || v_a || '__' || v_b;

  v_friend_name := nullif(trim(coalesce(p_friend_display_name, '')), '');
  if v_friend_name is null then
    select coalesce(
      nullif(trim(p.display_name), ''),
      p.rimvio_id,
      split_part(p.email_lower, '@', 1),
      '친구'
    )
    into v_friend_name
    from public.user_profiles p
    where p.user_id = p_other_user_id;
  end if;

  select coalesce(
    nullif(trim(p.display_name), ''),
    split_part(p.email_lower, '@', 1),
    '친구'
  )
  into v_caller_name
  from public.user_profiles p
  where p.user_id = v_caller;

  insert into public.peer_threads (id, owner_user_id, display_name, room_kind, ai_mode)
  values (v_thread_id, v_caller, coalesce(v_friend_name, '친구'), 'dm', 'private')
  on conflict (id) do nothing;

  insert into public.peer_thread_members (thread_id, user_id)
  values (v_thread_id, v_caller)
  on conflict (thread_id, user_id) do nothing;

  insert into public.peer_thread_members (thread_id, user_id)
  values (v_thread_id, p_other_user_id)
  on conflict (thread_id, user_id) do nothing;

  select coalesce(fc.interaction_score, 0)
  into v_caller_score
  from public.friend_connections fc
  where fc.user_id = v_caller and fc.friend_id = p_other_user_id;

  select coalesce(fc.interaction_score, 0)
  into v_other_score
  from public.friend_connections fc
  where fc.user_id = p_other_user_id and fc.friend_id = v_caller;

  insert into public.friend_connections (
    user_id,
    friend_id,
    thread_id,
    is_pinned,
    pin_slot,
    interaction_score,
    last_interaction_at,
    updated_at
  )
  values (
    v_caller,
    p_other_user_id,
    v_thread_id,
    false,
    null,
    v_caller_score + 1,
    v_now,
    v_now
  )
  on conflict (user_id, friend_id) do update
  set
    thread_id = excluded.thread_id,
    interaction_score = public.friend_connections.interaction_score + 1,
    last_interaction_at = v_now,
    updated_at = v_now;

  insert into public.friend_connections (
    user_id,
    friend_id,
    thread_id,
    is_pinned,
    pin_slot,
    interaction_score,
    last_interaction_at,
    updated_at
  )
  values (
    p_other_user_id,
    v_caller,
    v_thread_id,
    false,
    null,
    v_other_score + 1,
    v_now,
    v_now
  )
  on conflict (user_id, friend_id) do update
  set
    thread_id = excluded.thread_id,
    interaction_score = public.friend_connections.interaction_score + 1,
    last_interaction_at = v_now,
    updated_at = v_now;

  insert into public.relationship_slots (
    user_id,
    room_id,
    friend_id,
    last_message,
    last_activity_at,
    unread_count,
    is_pinned,
    archived_at,
    updated_at
  )
  values (v_caller, v_thread_id, p_other_user_id, null, v_now, 0, false, null, v_now)
  on conflict (user_id, room_id) do update
  set
    friend_id = excluded.friend_id,
    archived_at = null,
    last_activity_at = v_now,
    updated_at = v_now;

  insert into public.relationship_slots (
    user_id,
    room_id,
    friend_id,
    last_message,
    last_activity_at,
    unread_count,
    is_pinned,
    archived_at,
    updated_at
  )
  values (p_other_user_id, v_thread_id, v_caller, null, v_now, 0, false, null, v_now)
  on conflict (user_id, room_id) do update
  set
    friend_id = excluded.friend_id,
    archived_at = null,
    last_activity_at = v_now,
    updated_at = v_now;

  return jsonb_build_object(
    'thread_id', v_thread_id,
    'display_name', coalesce(v_friend_name, '친구'),
    'other_user_id', p_other_user_id
  );
end;
$$;

revoke all on function public.complete_dm_friend_add(uuid, text) from public;
grant execute on function public.complete_dm_friend_add(uuid, text) to authenticated;
