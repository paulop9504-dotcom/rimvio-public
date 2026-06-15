-- Only real Rimvio accounts (auth.users + user_profiles) count as members.

create or replace function public.rimvio_user_is_member(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from auth.users u
    inner join public.user_profiles p on p.user_id = u.id
    where u.id = p_user_id
  );
$$;

revoke all on function public.rimvio_user_is_member(uuid) from public;
grant execute on function public.rimvio_user_is_member(uuid) to authenticated;
