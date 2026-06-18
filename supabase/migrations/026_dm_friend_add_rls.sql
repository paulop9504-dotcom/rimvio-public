-- DM friend add: caller may add partner to thread + reciprocal friend_connections row.

create or replace function public.ensure_dm_thread_partner_member(
  p_thread_id text,
  p_partner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_a text;
  v_b text;
  v_expected text;
begin
  if v_caller is null then
    raise exception 'Authentication required.';
  end if;
  if p_partner_user_id = v_caller then
    raise exception 'Cannot add self as DM partner.';
  end if;
  if p_thread_id is null
    or p_thread_id not like 'peer-dm-%'
    or position('__' in p_thread_id) = 0 then
    raise exception 'Invalid DM thread id.';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_partner_user_id) then
    raise exception 'Partner is not a registered Rimvio user.';
  end if;

  if v_caller::text < p_partner_user_id::text then
    v_a := v_caller::text;
    v_b := p_partner_user_id::text;
  else
    v_a := p_partner_user_id::text;
    v_b := v_caller::text;
  end if;
  v_expected := 'peer-dm-' || v_a || '__' || v_b;
  if p_thread_id <> v_expected then
    raise exception 'DM thread id does not match the two users.';
  end if;

  if not exists (
    select 1
    from public.peer_thread_members m
    where m.thread_id = p_thread_id and m.user_id = v_caller
  ) then
    raise exception 'Caller must join the DM thread first.';
  end if;

  insert into public.peer_thread_members (thread_id, user_id)
  values (p_thread_id, p_partner_user_id)
  on conflict (thread_id, user_id) do nothing;
end;
$$;

create or replace function public.ensure_reciprocal_friend_connection(
  p_friend_id uuid,
  p_thread_id text,
  p_bump_interaction boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_score integer := 0;
begin
  if v_caller is null then
    raise exception 'Authentication required.';
  end if;
  if p_friend_id = v_caller then
    raise exception 'Cannot add self as friend.';
  end if;

  if not exists (
    select 1
    from public.peer_thread_members m_self
    inner join public.peer_thread_members m_friend
      on m_self.thread_id = m_friend.thread_id
    where m_self.thread_id = p_thread_id
      and m_self.user_id = v_caller
      and m_friend.user_id = p_friend_id
      and p_thread_id like 'peer-dm-%'
  ) then
    raise exception 'Both users must be members of the DM thread.';
  end if;

  select coalesce(fc.interaction_score, 0)
  into v_score
  from public.friend_connections fc
  where fc.user_id = p_friend_id and fc.friend_id = v_caller;

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
    p_friend_id,
    v_caller,
    p_thread_id,
    false,
    null,
    case when p_bump_interaction then v_score + 1 else v_score end,
    v_now,
    v_now
  )
  on conflict (user_id, friend_id) do update
  set
    thread_id = excluded.thread_id,
    interaction_score = case
      when p_bump_interaction then public.friend_connections.interaction_score + 1
      else public.friend_connections.interaction_score
    end,
    last_interaction_at = v_now,
    updated_at = v_now;
end;
$$;

revoke all on function public.ensure_dm_thread_partner_member(text, uuid) from public;
grant execute on function public.ensure_dm_thread_partner_member(text, uuid) to authenticated;

revoke all on function public.ensure_reciprocal_friend_connection(uuid, text, boolean) from public;
grant execute on function public.ensure_reciprocal_friend_connection(uuid, text, boolean) to authenticated;
