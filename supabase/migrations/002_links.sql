-- Rimvio: links table (core data model)
create extension if not exists "pgcrypto";

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  original_url text not null,
  title text not null,
  thumbnail_url text,
  domain text not null,
  category text,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz
);

create index if not exists links_created_at_idx on public.links (created_at desc);
create index if not exists links_user_id_idx on public.links (user_id);

alter table public.links enable row level security;

create policy "Public read links"
  on public.links for select to anon, authenticated using (true);

create policy "Anon insert links"
  on public.links for insert to anon with check (user_id is null);

create policy "Authenticated insert links"
  on public.links for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

create policy "Authenticated update own links"
  on public.links for update to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

create policy "Authenticated delete own links"
  on public.links for delete to authenticated
  using (auth.uid() = user_id or user_id is null);

alter table public.links replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'links'
  ) then
    alter publication supabase_realtime add table public.links;
  end if;
end $$;
