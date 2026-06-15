-- Experience Bridge — contributor may delete own shared capture rows

drop policy if exists "Contributor delete experience_bridge_contributions"
  on public.experience_bridge_contributions;

create policy "Contributor delete experience_bridge_contributions"
  on public.experience_bridge_contributions for delete to authenticated
  using (contributor_user_id = auth.uid());
