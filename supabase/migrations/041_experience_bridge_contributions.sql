-- Experience Bridge — participant/host media contributions after initial share

create table if not exists public.experience_bridge_contributions (
  bridge_event_id text not null references public.experience_bridges (event_id) on delete cascade,
  contributor_user_id uuid not null references auth.users (id) on delete cascade,
  capture_id text not null,
  capture jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (bridge_event_id, contributor_user_id, capture_id)
);

create index if not exists experience_bridge_contributions_bridge_idx
  on public.experience_bridge_contributions (bridge_event_id, created_at desc);

alter table public.experience_bridge_contributions enable row level security;

create policy "Bridge members read experience_bridge_contributions"
  on public.experience_bridge_contributions for select to authenticated
  using (
    public.is_experience_bridge_member(bridge_event_id, auth.uid())
    or public.is_experience_bridge_host(bridge_event_id, auth.uid())
  );

create policy "Bridge members insert experience_bridge_contributions"
  on public.experience_bridge_contributions for insert to authenticated
  with check (
    contributor_user_id = auth.uid()
    and (
      public.is_experience_bridge_member(bridge_event_id, auth.uid())
      or public.is_experience_bridge_host(bridge_event_id, auth.uid())
    )
  );

create policy "Contributor update experience_bridge_contributions"
  on public.experience_bridge_contributions for update to authenticated
  using (contributor_user_id = auth.uid())
  with check (contributor_user_id = auth.uid());
