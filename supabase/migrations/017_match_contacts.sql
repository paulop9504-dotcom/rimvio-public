-- 연락처 번호 일괄 매칭 (제출한 번호만 조회, 카톡식)

create or replace function public.match_users_by_phones(p_phones text[])
returns table (
  user_id uuid,
  phone_e164 text,
  display_name text,
  rimvio_id text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.user_id, p.phone_e164, p.display_name, p.rimvio_id
  from public.user_profiles p
  where p.phone_e164 = any (p_phones)
    and p.user_id <> auth.uid();
$$;

revoke all on function public.match_users_by_phones(text[]) from public;
grant execute on function public.match_users_by_phones(text[]) to authenticated;
