-- Rimvio DM: photo messages in peer chat

alter table public.peer_messages
  add column if not exists image_url text;

comment on column public.peer_messages.image_url is
  'Public URL of image attachment in peer-chat storage bucket';

alter table public.peer_messages drop constraint if exists peer_messages_body_check;

alter table public.peer_messages add constraint peer_messages_body_check check (
  char_length(body) <= 4000
  and (char_length(trim(body)) > 0 or image_url is not null)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'peer-chat',
  'peer-chat',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Peer chat image public read" on storage.objects;
create policy "Peer chat image public read"
  on storage.objects for select
  using (bucket_id = 'peer-chat');

drop policy if exists "Peer chat image owner insert" on storage.objects;
create policy "Peer chat image owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'peer-chat'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Peer chat image owner update" on storage.objects;
create policy "Peer chat image owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'peer-chat'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'peer-chat'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Peer chat image owner delete" on storage.objects;
create policy "Peer chat image owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'peer-chat'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
