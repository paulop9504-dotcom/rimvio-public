-- Rimvio: Google 가입만으로 친구 검색 가능 (ROOM 방문 불필요)

create or replace function public.rimvio_ensure_user_profile(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
begin
  if p_user_id is null then
    return false;
  end if;

  if exists (select 1 from public.user_profiles where user_id = p_user_id) then
    return true;
  end if;

  select
    lower(trim(u.email)),
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      split_part(lower(trim(u.email)), '@', 1)
    )
  into v_email, v_name
  from auth.users u
  where u.id = p_user_id;

  if v_email is null or v_email = '' or position('@' in v_email) = 0 then
    return false;
  end if;

  insert into public.user_profiles (user_id, email_lower, display_name, phone_e164, updated_at)
  values (p_user_id, v_email, v_name, null, timezone('utc', now()))
  on conflict (user_id) do update
    set
      email_lower = coalesce(public.user_profiles.email_lower, excluded.email_lower),
      display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
      updated_at = timezone('utc', now());

  return true;
end;
$$;

revoke all on function public.rimvio_ensure_user_profile(uuid) from public;
grant execute on function public.rimvio_ensure_user_profile(uuid) to authenticated;

create or replace function public.lookup_user_id_by_email(p_email_lower text)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid;
  v_norm text;
begin
  v_norm := lower(trim(p_email_lower));
  if v_norm is null or v_norm = '' then
    return null;
  end if;

  select user_id into v_uid
  from public.user_profiles
  where email_lower = v_norm
  limit 1;

  if v_uid is not null then
    return v_uid;
  end if;

  select id into v_uid
  from auth.users
  where lower(trim(email)) = v_norm
  limit 1;

  if v_uid is null then
    return null;
  end if;

  perform public.rimvio_ensure_user_profile(v_uid);
  return v_uid;
end;
$$;

revoke all on function public.lookup_user_id_by_email(text) from public;
grant execute on function public.lookup_user_id_by_email(text) to authenticated;
