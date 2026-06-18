-- Rimvio 아이디 (카톡 ID처럼 친구 검색)

alter table public.user_profiles
  add column if not exists rimvio_id text;

create unique index if not exists user_profiles_rimvio_id_unique
  on public.user_profiles (rimvio_id)
  where rimvio_id is not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_contact_check;

alter table public.user_profiles
  add constraint user_profiles_contact_check
  check (
    phone_e164 is not null
    or email_lower is not null
    or rimvio_id is not null
  );

create or replace function public.lookup_user_id_by_rimvio_id(p_rimvio_id text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id
  from public.user_profiles
  where rimvio_id = p_rimvio_id
  limit 1;
$$;

revoke all on function public.lookup_user_id_by_rimvio_id(text) from public;
grant execute on function public.lookup_user_id_by_rimvio_id(text) to authenticated;
