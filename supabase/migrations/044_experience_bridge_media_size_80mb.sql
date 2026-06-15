-- Raise Experience Bridge media bucket ceiling (80MB) — matches BRIDGE_VIDEO_MAX_BYTES

update storage.buckets
set file_size_limit = 83886080
where id = 'experience-bridge';
