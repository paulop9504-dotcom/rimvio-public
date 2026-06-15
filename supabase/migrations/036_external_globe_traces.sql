-- P2 — external experience traces (discoverable on globe, experience domain only)

alter table public.personal_globe_pins
  add column if not exists visibility text not null default 'private',
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.personal_globe_pins
  drop constraint if exists personal_globe_pins_visibility_check;

alter table public.personal_globe_pins
  add constraint personal_globe_pins_visibility_check
  check (visibility in ('private', 'external'));

create index if not exists personal_globe_pins_external_geo_idx
  on public.personal_globe_pins (lat, lng)
  where visibility = 'external';

drop policy if exists "Users read own personal globe pins" on public.personal_globe_pins;

create policy "Users read own or external globe pins"
  on public.personal_globe_pins for select to authenticated
  using (auth.uid() = user_id or visibility = 'external');
