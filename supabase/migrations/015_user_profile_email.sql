-- Rimvio: find friends by Google / email

alter table public.user_profiles
  add column if not exists email_lower text;

alter table public.user_profiles
  alter column phone_e164 drop not null;

create unique index if not exists user_profiles_email_lower_unique
  on public.user_profiles (email_lower)
  where email_lower is not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_contact_check;

alter table public.user_profiles
  add constraint user_profiles_contact_check
  check (phone_e164 is not null or email_lower is not null);

create or replace function public.lookup_user_id_by_email(p_email_lower text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id
  from public.user_profiles
  where email_lower = p_email_lower
  limit 1;
$$;

revoke all on function public.lookup_user_id_by_email(text) from public;
grant execute on function public.lookup_user_id_by_email(text) to authenticated;
