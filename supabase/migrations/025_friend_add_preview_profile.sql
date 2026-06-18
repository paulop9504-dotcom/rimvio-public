-- Friend-add (@친추) preview: read another member's public fields (RLS blocks direct select).

create or replace function public.get_friend_add_preview_profile(p_target_user_id uuid)
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
    'avatar_url', p.avatar_url,
    'email_lower', p.email_lower,
    'phone_e164', p.phone_e164
  )
  from public.user_profiles p
  where p.user_id = p_target_user_id
    and auth.uid() is not null
    and p_target_user_id <> auth.uid()
    and exists (
      select 1 from auth.users u where u.id = p_target_user_id
    )
  limit 1;
$$;

revoke all on function public.get_friend_add_preview_profile(uuid) from public;
grant execute on function public.get_friend_add_preview_profile(uuid) to authenticated;
