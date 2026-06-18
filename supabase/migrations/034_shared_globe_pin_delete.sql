-- 우리 지구 — thread 멤버가 collaborative globe_pin system 메시지 삭제 가능

create policy "Members delete shared globe pins"
  on public.peer_messages for delete to authenticated
  using (
    public.is_peer_thread_member(thread_id)
    and message_type = 'system'
    and (ai_payload->>'kind') = 'globe_pin'
  );
