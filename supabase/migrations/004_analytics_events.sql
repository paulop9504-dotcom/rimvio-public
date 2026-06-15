-- Blink Tier 1 analytics (anonymous append-only events)
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('enrich', 'action_click', 'funnel')),
  ts timestamptz not null,
  session_id text not null,
  flow_id text,
  domain text,
  enricher_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_events_type_ts_idx
  on public.analytics_events (event_type, ts desc);

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id, ts desc);

create index if not exists analytics_events_flow_idx
  on public.analytics_events (flow_id, ts desc)
  where flow_id is not null;

create index if not exists analytics_events_domain_idx
  on public.analytics_events (domain)
  where domain is not null;

alter table public.analytics_events enable row level security;

create policy "Public insert analytics events"
  on public.analytics_events for insert to anon, authenticated with check (true);

create policy "Public read analytics events"
  on public.analytics_events for select to anon, authenticated using (true);
