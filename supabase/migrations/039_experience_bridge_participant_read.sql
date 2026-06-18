-- Pending/accepted bridge members can read co-participants (host name on inbox).
-- NOTE: superseded by 040_fix_experience_bridge_rls_recursion.sql (self-subquery recurses).

drop policy if exists "Bridge members read experience_bridge_participants"
  on public.experience_bridge_participants;

create policy "Bridge members read experience_bridge_participants"
  on public.experience_bridge_participants for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.experience_bridges b
      where b.event_id = experience_bridge_participants.bridge_event_id
        and b.host_user_id = auth.uid()
    )
    or exists (
      select 1 from public.experience_bridge_participants self
      where self.bridge_event_id = experience_bridge_participants.bridge_event_id
        and self.user_id = auth.uid()
        and self.status = 'accepted'
    )
  );
