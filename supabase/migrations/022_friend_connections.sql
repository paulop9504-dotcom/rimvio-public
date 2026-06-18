-- Rimvio: relationship graph (pin + archive + bubble unread)

create table if not exists public.friend_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  thread_id text not null references public.peer_threads (id) on delete cascade,
  is_pinned boolean not null default false,
  pin_slot smallint check (pin_slot is null or (pin_slot >= 0 and pin_slot < 5)),
  interaction_score integer not null default 0,
  last_interaction_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz not null default timezone('utc', now()),
  last_inbound_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  messages_purge_after timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, friend_id),
  constraint friend_connections_no_self check (user_id <> friend_id)
);

create unique index if not exists friend_connections_pinned_slot_unique
  on public.friend_connections (user_id, pin_slot)
  where is_pinned and pin_slot is not null;

create index if not exists friend_connections_user_pinned_idx
  on public.friend_connections (user_id, is_pinned);

create index if not exists friend_connections_user_archive_idx
  on public.friend_connections (user_id, last_interaction_at desc)
  where not is_pinned;

alter table public.friend_connections enable row level security;

drop policy if exists "Users read own friend connections" on public.friend_connections;
create policy "Users read own friend connections"
  on public.friend_connections for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own friend connections" on public.friend_connections;
create policy "Users insert own friend connections"
  on public.friend_connections for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own friend connections" on public.friend_connections;
create policy "Users update own friend connections"
  on public.friend_connections for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own friend connections" on public.friend_connections;
create policy "Users delete own friend connections"
  on public.friend_connections for delete to authenticated
  using (auth.uid() = user_id);
