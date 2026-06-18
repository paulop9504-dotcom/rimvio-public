-- Cached Google Places lookups keyed by normalized place name (Gemini vision output).
create table if not exists public.place_locate_cache (
  id uuid primary key default gen_random_uuid(),
  place_name_key text not null unique,
  place_name text not null,
  formatted_address text,
  lat double precision not null,
  lng double precision not null,
  google_place_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists place_locate_cache_updated_idx
  on public.place_locate_cache (updated_at desc);

alter table public.place_locate_cache enable row level security;

create policy "Public read place locate cache"
  on public.place_locate_cache for select to anon, authenticated using (true);

create policy "Public upsert place locate cache"
  on public.place_locate_cache for insert to anon, authenticated with check (true);

create policy "Public update place locate cache"
  on public.place_locate_cache for update to anon, authenticated using (true);
