-- Experience Bridge — shared experience node + participant invites (A↔B↔N)

create table if not exists public.experience_bridges (
  event_id text primary key,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  peer_thread_id text references public.peer_threads (id) on delete set null,
  title text not null,
  place_label text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  event_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists experience_bridges_host_idx
  on public.experience_bridges (host_user_id, created_at desc);

create table if not exists public.experience_bridge_participants (
  bridge_event_id text not null references public.experience_bridges (event_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('host', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'left', 'removed')),
  invited_at timestamptz not null default timezone('utc', now()),
  joined_at timestamptz,
  left_at timestamptz,
  primary key (bridge_event_id, user_id)
);

create index if not exists experience_bridge_participants_user_status_idx
  on public.experience_bridge_participants (user_id, status, invited_at desc);

alter table public.experience_bridges enable row level security;
alter table public.experience_bridge_participants enable row level security;

-- Bridges: host + accepted/pending participants can read
create policy "Bridge participants read experience_bridges"
  on public.experience_bridges for select to authenticated
  using (
    host_user_id = auth.uid()
    or exists (
      select 1 from public.experience_bridge_participants p
      where p.bridge_event_id = experience_bridges.event_id
        and p.user_id = auth.uid()
        and p.status in ('pending', 'accepted')
    )
  );

create policy "Host insert experience_bridges"
  on public.experience_bridges for insert to authenticated
  with check (host_user_id = auth.uid());

create policy "Host update experience_bridges"
  on public.experience_bridges for update to authenticated
  using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

-- Participants
create policy "Bridge members read experience_bridge_participants"
  on public.experience_bridge_participants for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.experience_bridges b
      where b.event_id = experience_bridge_participants.bridge_event_id
        and b.host_user_id = auth.uid()
    )
    or exists (
      select 1 from public.experience_bridge_participants self
      where self.bridge_event_id = experience_bridge_participants.bridge_event_id
        and self.user_id = auth.uid()
        and self.status = 'accepted'
    )
  );

create policy "Host insert bridge participants"
  on public.experience_bridge_participants for insert to authenticated
  with check (
    exists (
      select 1 from public.experience_bridges b
      where b.event_id = experience_bridge_participants.bridge_event_id
        and b.host_user_id = auth.uid()
    )
  );

create policy "Self or host update bridge participants"
  on public.experience_bridge_participants for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.experience_bridges b
      where b.event_id = experience_bridge_participants.bridge_event_id
        and b.host_user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.experience_bridges b
      where b.event_id = experience_bridge_participants.bridge_event_id
        and b.host_user_id = auth.uid()
    )
  );
