-- Rimvio Chat: human + AI layers (DM private AI, group shared AI later)

alter table public.peer_threads
  add column if not exists room_kind text not null default 'dm'
    check (room_kind in ('dm', 'group')),
  add column if not exists ai_mode text not null default 'private'
    check (ai_mode in ('private', 'shared'));

alter table public.peer_messages
  add column if not exists message_type text not null default 'human'
    check (message_type in ('human', 'ai_private', 'ai_shared', 'system')),
  add column if not exists ai_payload jsonb;

create index if not exists peer_messages_thread_type_idx
  on public.peer_messages (thread_id, message_type, created_at);

-- Visibility-aware read
drop policy if exists "Members read peer_messages" on public.peer_messages;

create policy "Members read peer_messages by visibility"
  on public.peer_messages for select to authenticated
  using (
    exists (
      select 1 from public.peer_thread_members m
      where m.thread_id = peer_messages.thread_id
        and m.user_id = auth.uid()
    )
    and (
      message_type in ('human', 'system', 'ai_shared')
      or (message_type = 'ai_private' and sender_user_id = auth.uid())
    )
  );
