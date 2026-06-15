-- Feed visual hints (brand / poster / thumb + enricher source)
alter table public.links
  add column if not exists visual_mode text check (visual_mode in ('brand', 'poster', 'thumb')),
  add column if not exists source_type text;
