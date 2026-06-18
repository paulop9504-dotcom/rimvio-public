-- Fix RLS infinite recursion on experience bridge tables (039 self-subquery).

create or replace function public.is_experience_bridge_member(
  p_bridge_event_id text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.experience_bridge_participants p
    where p.bridge_event_id = p_bridge_event_id
      and p.user_id = coalesce(p_user_id, auth.uid())
      and p.status in ('pending', 'accepted')
  );
$$;

create or replace function public.is_experience_bridge_host(
  p_bridge_event_id text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.experience_bridges b
    where b.event_id = p_bridge_event_id
      and b.host_user_id = coalesce(p_user_id, auth.uid())
  );
$$;

revoke all on function public.is_experience_bridge_member(text, uuid) from public;
grant execute on function public.is_experience_bridge_member(text, uuid) to authenticated;

revoke all on function public.is_experience_bridge_host(text, uuid) from public;
grant execute on function public.is_experience_bridge_host(text, uuid) to authenticated;

drop policy if exists "Bridge participants read experience_bridges"
  on public.experience_bridges;

create policy "Bridge participants read experience_bridges"
  on public.experience_bridges for select to authenticated
  using (
    host_user_id = auth.uid()
    or public.is_experience_bridge_member(event_id, auth.uid())
  );

drop policy if exists "Bridge members read experience_bridge_participants"
  on public.experience_bridge_participants;

create policy "Bridge members read experience_bridge_participants"
  on public.experience_bridge_participants for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_experience_bridge_host(bridge_event_id, auth.uid())
    or public.is_experience_bridge_member(bridge_event_id, auth.uid())
  );

drop policy if exists "Host insert bridge participants"
  on public.experience_bridge_participants;

create policy "Host insert bridge participants"
  on public.experience_bridge_participants for insert to authenticated
  with check (public.is_experience_bridge_host(bridge_event_id, auth.uid()));

drop policy if exists "Self or host update bridge participants"
  on public.experience_bridge_participants;

create policy "Self or host update bridge participants"
  on public.experience_bridge_participants for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_experience_bridge_host(bridge_event_id, auth.uid())
  )
  with check (
    user_id = auth.uid()
    or public.is_experience_bridge_host(bridge_event_id, auth.uid())
  );
