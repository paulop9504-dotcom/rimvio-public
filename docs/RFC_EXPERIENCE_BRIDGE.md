# RFC: Experience Bridge (A↔B↔N Shared Globe)

> **Status:** v1 shipped 2026-06 · **Phase:** P3 gathering spine

## One line

Single Experience Node (`EventCandidate`) + multi-owner media + per-user personal globe pin projection.

## SSOT

| Layer | Store |
|-------|--------|
| Experience truth | Host `EventCandidate` (+ `event_snapshot` on server) |
| Participation | `experience_bridge_participants` |
| Shared media stream | `peer_messages` globe pins + host `feedCaptures` |
| Personal entry | `personal_globe_pins` / localStorage projection |

## v1 decisions

- **Join:** invite → **accept required** (thread member pick)
- **Leave:** shared read revoked; own pin + own media kept
- **Read:** others' media **view-only** (no export UI)
- **Cap:** 10 slots (host + guests, incl. pending)
- **Scope:** same rules internal/external; external promote = separate opt-in (future)

## API

| Route | Action |
|-------|--------|
| `GET /api/experience-bridge/[eventId]` | state + merged timeline |
| `POST …/bootstrap` | host creates bridge |
| `POST …/invite` | host invites participant |
| `POST …/accept` | guest accept + pin spec |
| `POST …/decline` | guest decline |
| `POST …/leave` | guest leave |
| `GET /api/experience-bridge/invites` | pending inbox |

## UI

- `ExperienceBridgePanel` in `PinOpenSheet` (함께하는 경험)
- `ExperienceBridgeInviteBanner` on globe home (pending invites)
- Migration: `038_experience_bridge.sql`

## Tests

`npm run test:experience-bridge`
