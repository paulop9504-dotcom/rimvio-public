-- 상대가 읽은 시각 — 발신자 friend_connections 행에 기록 (RLS로 본인만 조회)

alter table public.friend_connections
  add column if not exists peer_last_read_at timestamptz;

comment on column public.friend_connections.peer_last_read_at is
  'When the friend last opened this DM — used to hide sent check marks for the viewer.';
