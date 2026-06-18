-- Rimvio: Relationship Feed slots (Room ≠ Slot; slot = feed surface)

create table if not exists public.relationship_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  room_id text not null references public.peer_threads (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  last_message text,
  last_activity_at timestamptz not null default timezone('utc', now()),
  unread_count integer not null default 0 check (unread_count >= 0),
  is_pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint relationship_slots_no_self check (user_id <> friend_id),
  constraint relationship_slots_user_room_unique unique (user_id, room_id)
);

create index if not exists relationship_slots_feed_idx
  on public.relationship_slots (user_id, is_pinned desc, last_activity_at desc)
  where archived_at is null;

create index if not exists relationship_slots_archive_idx
  on public.relationship_slots (user_id, last_activity_at desc)
  where archived_at is not null;

alter table public.relationship_slots enable row level security;

drop policy if exists "Users read own relationship slots" on public.relationship_slots;
create policy "Users read own relationship slots"
  on public.relationship_slots for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own relationship slots" on public.relationship_slots;
create policy "Users insert own relationship slots"
  on public.relationship_slots for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own relationship slots" on public.relationship_slots;
create policy "Users update own relationship slots"
  on public.relationship_slots for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own relationship slots" on public.relationship_slots;
create policy "Users delete own relationship slots"
  on public.relationship_slots for delete to authenticated
  using (auth.uid() = user_id);
