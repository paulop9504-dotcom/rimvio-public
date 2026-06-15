-- Per-user connected services (OAuth tokens + API keys, encrypted at rest)

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  session_id text,
  provider text not null,
  auth_kind text not null check (auth_kind in ('oauth', 'api_key')),
  status text not null default 'connected'
    check (status in ('connected', 'error', 'revoked')),
  label text,
  masked_secret text,
  secret_ciphertext text not null,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_integrations_user_provider_uidx
  on public.user_integrations (user_id, provider);

create index if not exists user_integrations_user_updated_idx
  on public.user_integrations (user_id, updated_at desc)
  where user_id is not null;

alter table public.user_integrations enable row level security;

create policy "Users read own integrations"
  on public.user_integrations
  for select
  using (auth.uid() = user_id);

create policy "Users insert own integrations"
  on public.user_integrations
  for insert
  with check (auth.uid() = user_id);

create policy "Users update own integrations"
  on public.user_integrations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own integrations"
  on public.user_integrations
  for delete
  using (auth.uid() = user_id);
