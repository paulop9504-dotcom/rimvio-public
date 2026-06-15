-- Bridge contributions — only accepted members may insert (matches API layer)

drop policy if exists "Bridge members insert experience_bridge_contributions"
  on public.experience_bridge_contributions;

create policy "Bridge members insert experience_bridge_contributions"
  on public.experience_bridge_contributions for insert to authenticated
  with check (
    contributor_user_id = auth.uid()
    and exists (
      select 1
      from public.experience_bridge_participants p
      where p.bridge_event_id = experience_bridge_contributions.bridge_event_id
        and p.user_id = auth.uid()
        and p.status = 'accepted'
    )
  );
