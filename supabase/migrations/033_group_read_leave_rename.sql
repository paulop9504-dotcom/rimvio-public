-- 단톡: 멤버별 읽음 커서 · 이름 변경 · 나가기

alter table public.peer_thread_members
  add column if not exists last_read_at timestamptz;

comment on column public.peer_thread_members.last_read_at is
  'When this member last opened the thread — group read receipts.';

drop policy if exists "Self update peer_thread_member read" on public.peer_thread_members;
create policy "Self update peer_thread_member read"
  on public.peer_thread_members for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Self leave peer_thread_members" on public.peer_thread_members;
create policy "Self leave peer_thread_members"
  on public.peer_thread_members for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.rimvio_rename_group_thread(
  p_thread_id text,
  p_display_name text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := nullif(trim(coalesce(p_display_name, '')), '');
  if v_name is null then
    raise exception 'name_required:방 이름을 입력해 주세요.';
  end if;

  if not exists (
    select 1 from public.peer_threads
    where id = p_thread_id and room_kind = 'group'
  ) then
    raise exception 'not_group:단톡 방만 이름을 바꿀 수 있어요.';
  end if;

  if not exists (
    select 1 from public.peer_thread_members
    where thread_id = p_thread_id and user_id = auth.uid()
  ) then
    raise exception 'forbidden:이 대화방에 참여 중이 아니에요.';
  end if;

  update public.peer_threads
  set display_name = v_name
  where id = p_thread_id;

  return v_name;
end;
$$;

revoke all on function public.rimvio_rename_group_thread(text, text) from public;
grant execute on function public.rimvio_rename_group_thread(text, text) to authenticated;
