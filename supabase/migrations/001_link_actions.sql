-- Rimvio: link_actions + Realtime
create extension if not exists "pgcrypto";

create table if not exists public.link_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  title text not null,
  subtitle text not null default '',
  href text not null,
  prefetch_href text,
  status text not null default 'pending' check (status in ('ready', 'pending', 'done')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists link_actions_created_at_idx
  on public.link_actions (created_at desc);

alter table public.link_actions enable row level security;

create policy "Public read link_actions"
  on public.link_actions
  for select
  to anon, authenticated
  using (true);

create policy "Anon insert link_actions"
  on public.link_actions
  for insert
  to anon
  with check (user_id is null);

create policy "Authenticated insert link_actions"
  on public.link_actions
  for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

create policy "Authenticated update own link_actions"
  on public.link_actions
  for update
  to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

create policy "Authenticated delete own link_actions"
  on public.link_actions
  for delete
  to authenticated
  using (auth.uid() = user_id or user_id is null);

alter table public.link_actions replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'link_actions'
  ) then
    alter publication supabase_realtime add table public.link_actions;
  end if;
end $$;
