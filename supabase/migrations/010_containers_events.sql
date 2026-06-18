-- Goal-oriented containers + events with optional container_id FK
create table if not exists public.containers (
  id text primary key,
  goal text not null default '',
  title text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  knowledge jsonb not null default '[]'::jsonb,
  topic text,
  kind text not null default 'context' check (kind in ('canonical', 'context', 'place')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz not null default timezone('utc', now())
);

create index if not exists containers_status_active_idx
  on public.containers (status, last_active_at desc);

create table if not exists public.container_events (
  id uuid primary key default gen_random_uuid(),
  container_id text references public.containers (id) on delete set null,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists container_events_container_idx
  on public.container_events (container_id, created_at desc);

create index if not exists container_events_created_idx
  on public.container_events (created_at desc);

alter table public.containers enable row level security;
alter table public.container_events enable row level security;

create policy "Public read containers"
  on public.containers for select to anon, authenticated using (true);

create policy "Public insert containers"
  on public.containers for insert to anon, authenticated with check (true);

create policy "Public update containers"
  on public.containers for update to anon, authenticated using (true);

create policy "Public read container events"
  on public.container_events for select to anon, authenticated using (true);

create policy "Public insert container events"
  on public.container_events for insert to anon, authenticated with check (true);
