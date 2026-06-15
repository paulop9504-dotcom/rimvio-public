-- Rimvio: phone lookup for 1:1 chat (no invite link required)

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_e164 text not null,
  display_name text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_profiles_phone_e164_unique unique (phone_e164)
);

create index if not exists user_profiles_phone_e164_idx
  on public.user_profiles (phone_e164);

alter table public.user_profiles enable row level security;

create policy "Users read own profile"
  on public.user_profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "Users upsert own profile"
  on public.user_profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own profile"
  on public.user_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Lookup by phone (authenticated only, returns user_id only)
create or replace function public.lookup_user_id_by_phone(p_phone_e164 text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id
  from public.user_profiles
  where phone_e164 = p_phone_e164
  limit 1;
$$;

revoke all on function public.lookup_user_id_by_phone(text) from public;
grant execute on function public.lookup_user_id_by_phone(text) to authenticated;
