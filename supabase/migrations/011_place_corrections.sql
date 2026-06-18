-- User place correction / preference learning (IndexedDB sync target)
create table if not exists public.place_corrections (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid references auth.users (id) on delete cascade,
  session_id text not null,
  user_input text not null,
  ai_inferred_location text,
  ai_inferred_place_name text,
  user_corrected_location text,
  user_corrected_place_name text,
  outcome text not null check (outcome in ('accepted', 'corrected', 'rejected')),
  intent_key text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists place_corrections_session_client_unique
  on public.place_corrections (session_id, client_id);

create unique index if not exists place_corrections_user_client_unique
  on public.place_corrections (user_id, client_id)
  where user_id is not null;

create index if not exists place_corrections_user_created_idx
  on public.place_corrections (user_id, created_at desc)
  where user_id is not null;

create index if not exists place_corrections_session_created_idx
  on public.place_corrections (session_id, created_at desc);

create index if not exists place_corrections_intent_idx
  on public.place_corrections (intent_key, created_at desc)
  where intent_key is not null;

alter table public.place_corrections enable row level security;

create policy "Public read own session place corrections"
  on public.place_corrections for select to anon, authenticated using (true);

create policy "Public insert place corrections"
  on public.place_corrections for insert to anon, authenticated with check (true);

create policy "Public update place corrections"
  on public.place_corrections for update to anon, authenticated using (true);
