# Storage modes (MVP)

Rimvio currently uses **hybrid storage** for demo/local MVP:

| Data | Primary (demo) | Production target |
|------|----------------|-------------------|
| Links (auth) | Supabase | Supabase |
| Links (guest) | localStorage | Supabase |
| Rooms | `.data/rooms/*.json` | Supabase `rooms` (migration 006) |
| Beams | `.data/beams/*.json` + Supabase slug | Supabase |
| Scrape cache | `.data/cache/scrape/` | Redis / edge cache |

**Important:** File-based room/beam storage is **single-instance only**. On Vercel serverless, treat rooms/beams as demo until migrated to Supabase.

Set `NEXT_PUBLIC_ROOM_MVP=0` to re-enable live SSE/presence when scaling.
