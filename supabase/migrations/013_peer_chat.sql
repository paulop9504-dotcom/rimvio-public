-- Rimvio: 1:1 peer chat (Supabase Realtime)

create table if not exists public.peer_threads (
  id text primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '친구',
  invite_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.peer_thread_members (
  thread_id text not null references public.peer_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (thread_id, user_id)
);

create index if not exists peer_thread_members_user_idx
  on public.peer_thread_members (user_id);

create table if not exists public.peer_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null references public.peer_threads (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists peer_messages_thread_created_idx
  on public.peer_messages (thread_id, created_at asc);

alter table public.peer_threads enable row level security;
alter table public.peer_thread_members enable row level security;
alter table public.peer_messages enable row level security;

-- Threads: members can read; owner can create
create policy "Members read peer_threads"
  on public.peer_threads for select to authenticated
  using (
    exists (
      select 1 from public.peer_thread_members m
      where m.thread_id = peer_threads.id and m.user_id = auth.uid()
    )
  );

create policy "Owner insert peer_threads"
  on public.peer_threads for insert to authenticated
  with check (auth.uid() = owner_user_id);

create policy "Owner update peer_threads"
  on public.peer_threads for update to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Members
create policy "Members read peer_thread_members"
  on public.peer_thread_members for select to authenticated
  using (
    exists (
      select 1 from public.peer_thread_members m
      where m.thread_id = peer_thread_members.thread_id and m.user_id = auth.uid()
    )
  );

create policy "Self join peer_thread_members"
  on public.peer_thread_members for insert to authenticated
  with check (auth.uid() = user_id);

-- Messages
create policy "Members read peer_messages"
  on public.peer_messages for select to authenticated
  using (
    exists (
      select 1 from public.peer_thread_members m
      where m.thread_id = peer_messages.thread_id and m.user_id = auth.uid()
    )
  );

create policy "Members insert peer_messages"
  on public.peer_messages for insert to authenticated
  with check (
    auth.uid() = sender_user_id
    and exists (
      select 1 from public.peer_thread_members m
      where m.thread_id = peer_messages.thread_id and m.user_id = auth.uid()
    )
  );

alter table public.peer_messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'peer_messages'
  ) then
    alter publication supabase_realtime add table public.peer_messages;
  end if;
end $$;
