-- Personal globe pins — owner SSOT (localStorage bridge → server)

create table if not exists public.personal_globe_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  pin jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists personal_globe_pins_user_updated_idx
  on public.personal_globe_pins (user_id, updated_at desc);

alter table public.personal_globe_pins enable row level security;

create policy "Users read own personal globe pins"
  on public.personal_globe_pins for select to authenticated
  using (auth.uid() = user_id);

create policy "Users upsert own personal globe pins"
  on public.personal_globe_pins for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own personal globe pins"
  on public.personal_globe_pins for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own personal globe pins"
  on public.personal_globe_pins for delete to authenticated
  using (auth.uid() = user_id);
