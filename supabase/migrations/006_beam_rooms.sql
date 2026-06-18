-- Blink Beam + Link Rooms (collaboration layer)

alter table public.links
  add column if not exists share_slug text unique,
  add column if not exists link_status text not null default 'open'
    check (link_status in ('open', 'done')),
  add column if not exists room_id uuid;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.links
  drop constraint if exists links_room_id_fkey;

alter table public.links
  add constraint links_room_id_fkey
  foreign key (room_id) references public.rooms (id) on delete set null;

create index if not exists links_share_slug_idx on public.links (share_slug);
create index if not exists links_room_id_idx on public.links (room_id);

create table if not exists public.link_comments (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links (id) on delete cascade,
  kind text not null default 'text'
    check (kind in ('text', 'done', 'coupon', 'note')),
  message text not null,
  author_label text not null default 'Guest',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists link_comments_link_id_idx on public.link_comments (link_id);

alter table public.rooms enable row level security;
alter table public.link_comments enable row level security;

create policy "Public read rooms"
  on public.rooms for select to anon, authenticated using (true);

create policy "Anon insert rooms"
  on public.rooms for insert to anon with check (true);

create policy "Public read link_comments"
  on public.link_comments for select to anon, authenticated using (true);

create policy "Anon insert link_comments"
  on public.link_comments for insert to anon with check (true);

alter table public.link_comments replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'link_comments'
  ) then
    alter publication supabase_realtime add table public.link_comments;
  end if;
end $$;
