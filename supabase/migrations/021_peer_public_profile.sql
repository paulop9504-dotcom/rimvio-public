-- Public profile fields for DM peers (photo, name, Rimvio ID only).

create or replace function public.get_peer_public_profile(p_target_user_id uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'rimvio_id', p.rimvio_id,
    'avatar_url', p.avatar_url
  )
  from public.user_profiles p
  where p.user_id = p_target_user_id
    and auth.uid() is not null
    and p_target_user_id <> auth.uid()
    and exists (
      select 1
      from public.peer_thread_members m_self
      inner join public.peer_thread_members m_peer
        on m_self.thread_id = m_peer.thread_id
      where m_self.user_id = auth.uid()
        and m_peer.user_id = p_target_user_id
        and m_self.thread_id like 'peer-dm-%'
    )
  limit 1;
$$;

revoke all on function public.get_peer_public_profile(uuid) from public;
grant execute on function public.get_peer_public_profile(uuid) to authenticated;
