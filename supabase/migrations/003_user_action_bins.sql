-- Blink: rolling action stats by context bin (global + optional user)
create table if not exists public.user_action_bins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  context_bin text not null,
  action_key text not null,
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  skips integer not null default 0 check (skips >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_action_bins_global_unique
  on public.user_action_bins (context_bin, action_key)
  where user_id is null;

create unique index if not exists user_action_bins_user_unique
  on public.user_action_bins (user_id, context_bin, action_key)
  where user_id is not null;

create index if not exists user_action_bins_context_idx
  on public.user_action_bins (context_bin);

create index if not exists user_action_bins_user_context_idx
  on public.user_action_bins (user_id, context_bin)
  where user_id is not null;

alter table public.user_action_bins enable row level security;

create policy "Public read action bins"
  on public.user_action_bins for select to anon, authenticated using (true);

create policy "Public insert action bins"
  on public.user_action_bins for insert to anon, authenticated with check (true);

create policy "Public update action bins"
  on public.user_action_bins for update to anon, authenticated using (true);

create or replace function public.record_action_bin_event(
  p_context_bin text,
  p_action_key text,
  p_event text,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event not in ('impression', 'click', 'skip') then
    raise exception 'Invalid event type: %', p_event;
  end if;

  if p_user_id is null then
    insert into public.user_action_bins as bins (
      user_id,
      context_bin,
      action_key,
      impressions,
      clicks,
      skips,
      updated_at
    )
    values (
      null,
      p_context_bin,
      p_action_key,
      case when p_event = 'impression' then 1 else 0 end,
      case when p_event = 'click' then 1 else 0 end,
      case when p_event = 'skip' then 1 else 0 end,
      timezone('utc', now())
    )
    on conflict (context_bin, action_key) where user_id is null
    do update set
      impressions = bins.impressions + excluded.impressions,
      clicks = bins.clicks + excluded.clicks,
      skips = bins.skips + excluded.skips,
      updated_at = timezone('utc', now());
  else
    insert into public.user_action_bins as bins (
      user_id,
      context_bin,
      action_key,
      impressions,
      clicks,
      skips,
      updated_at
    )
    values (
      p_user_id,
      p_context_bin,
      p_action_key,
      case when p_event = 'impression' then 1 else 0 end,
      case when p_event = 'click' then 1 else 0 end,
      case when p_event = 'skip' then 1 else 0 end,
      timezone('utc', now())
    )
    on conflict (user_id, context_bin, action_key) where user_id is not null
    do update set
      impressions = bins.impressions + excluded.impressions,
      clicks = bins.clicks + excluded.clicks,
      skips = bins.skips + excluded.skips,
      updated_at = timezone('utc', now());
  end if;
end;
$$;

grant execute on function public.record_action_bin_event(text, text, text, uuid)
  to anon, authenticated;
