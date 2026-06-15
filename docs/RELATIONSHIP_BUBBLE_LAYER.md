# Relationship Bubble Layer

Rimvio does not use a traditional friend list as the home surface.

## Center

- **ME** — always visible at the center of `/peers`.

## Around ME (max 5)

- **Pinned friends** — Always Visible Connections.
- `pinFriend(friendId, pinSlot)` — no expiry.
- Bubble states: `idle` (gray), `active` (yellow ring), `urgent` (yellow pulse).
- Read DM → bubble returns to `idle`.

## Friend Archive

- Unpinned friends only.
- Search by name / Rimvio ID.
- Recent chat from archive rows.
- **Retention:** messages deleted 7 days after unpin (`messages_purge_after`); `friend_connections` row kept.

## Data

- Table: `friend_connections` (migration `022_friend_connections.sql`).
- API: `GET /api/peers/social/layer`, `POST .../pin`, `POST .../unpin`, `POST .../read`.

## Vision

Density over volume — five relationships always in view; the rest appear when needed.
