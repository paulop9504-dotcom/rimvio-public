-- Experience Bridge — public storage for shared photos + videos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'experience-bridge',
  'experience-bridge',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/3gpp',
    'video/3gpp2'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Experience bridge media public read" on storage.objects;
create policy "Experience bridge media public read"
  on storage.objects for select
  using (bucket_id = 'experience-bridge');

drop policy if exists "Experience bridge media owner insert" on storage.objects;
create policy "Experience bridge media owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'experience-bridge'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Experience bridge media owner update" on storage.objects;
create policy "Experience bridge media owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'experience-bridge'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'experience-bridge'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Experience bridge media owner delete" on storage.objects;
create policy "Experience bridge media owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'experience-bridge'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
