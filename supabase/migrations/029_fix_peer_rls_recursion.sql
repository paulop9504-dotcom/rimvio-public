-- Break RLS infinite recursion: peer_thread_members policies must not subquery themselves.

create or replace function public.is_peer_thread_member(
  p_thread_id text,
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
    from public.peer_thread_members m
    where m.thread_id = p_thread_id
      and m.user_id = coalesce(p_user_id, auth.uid())
  );
$$;

revoke all on function public.is_peer_thread_member(text, uuid) from public;
grant execute on function public.is_peer_thread_member(text, uuid) to authenticated;

drop policy if exists "Members read peer_threads" on public.peer_threads;
create policy "Members read peer_threads"
  on public.peer_threads for select to authenticated
  using (public.is_peer_thread_member(id));

drop policy if exists "Members read peer_thread_members" on public.peer_thread_members;
create policy "Members read peer_thread_members"
  on public.peer_thread_members for select to authenticated
  using (public.is_peer_thread_member(thread_id));

drop policy if exists "Members read peer_messages by visibility" on public.peer_messages;
create policy "Members read peer_messages by visibility"
  on public.peer_messages for select to authenticated
  using (
    public.is_peer_thread_member(thread_id)
    and (
      message_type in ('human', 'system', 'ai_shared')
      or (message_type = 'ai_private' and sender_user_id = auth.uid())
    )
  );

drop policy if exists "Members insert peer_messages" on public.peer_messages;
create policy "Members insert peer_messages"
  on public.peer_messages for insert to authenticated
  with check (
    auth.uid() = sender_user_id
    and public.is_peer_thread_member(thread_id)
  );
