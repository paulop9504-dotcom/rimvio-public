-- P1 platform index — owner geo lookup for pin projection API

create index if not exists personal_globe_pins_owner_geo_idx
  on public.personal_globe_pins (user_id, lat, lng)
  where lat is not null and lng is not null;

alter table public.personal_globe_pins
  add column if not exists cell_key text;

create index if not exists personal_globe_pins_cell_key_idx
  on public.personal_globe_pins (cell_key)
  where cell_key is not null;
